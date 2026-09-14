import numpy as np
import tifffile

from app.registration.imaging import Resampling, load_image, normalize_to_uint8, pixel_to_map, resample_to_gsd, write_geotiff


def test_16bit_tiff_keeps_full_dynamic_range(tmp_path):
    data = np.linspace(0, 4095, 64 * 48).round().reshape(48, 64).astype(np.uint16)  # 12-bit range
    path = tmp_path / "strip.tif"
    tifffile.imwrite(path, data)

    image = load_image(path)

    assert image.source_dtype == "uint16"
    assert image.data.dtype == np.float32
    assert image.data.max() == 4095  # an 8-bit read would have clipped this to 255
    np.testing.assert_array_equal(image.data, data.astype(np.float32))


def test_lzw_compressed_float_geotiff_loads(tmp_path):
    # LROC orthophotos and DTMs are LZW-compressed float TIFFs.
    data = np.random.default_rng(0).normal(-2000, 300, (40, 50)).astype(np.float32)
    path = tmp_path / "dtm.tif"
    tifffile.imwrite(path, data, compression="lzw")

    image = load_image(path)

    assert image.source_dtype == "float32"
    np.testing.assert_allclose(image.data, data)


def test_geotiff_nodata_becomes_nan_and_pixel_size_is_read(tmp_path):
    sentinel = np.finfo(np.float32).min  # what LROC DTMs use for missing cells
    data = np.full((30, 30), 500.0, dtype=np.float32)
    data[:3, :] = sentinel
    path = tmp_path / "dtm.tif"
    tifffile.imwrite(
        path,
        data,
        compression="lzw",
        extratags=[
            (33550, "d", 3, (3.0, 3.0, 0.0), True),  # ModelPixelScaleTag: 3 m pixels
            (33922, "d", 6, (0, 0, 0, -786.0, 612885.0, 0), True),  # ModelTiepointTag
            (42113, "s", 0, "-3.4028226550889045e+38", True),  # GDAL_NODATA
        ],
    )

    image = load_image(path)

    assert np.isnan(image.data[:3]).all()
    assert np.nanmin(image.data) == 500.0
    assert image.metadata["nodata_pixels"] == 90
    assert image.metadata["gsd"] == 3.0
    assert image.metadata["origin"] == (-786.0, 612885.0)


def test_normalize_to_uint8_stretches_percentiles():
    data = np.linspace(1000, 3000, 10000, dtype=np.float32).reshape(100, 100)
    out = normalize_to_uint8(data, 0, 100)
    assert out.dtype == np.uint8
    assert out.min() == 0 and out.max() == 255


def test_resampling_coordinate_round_trip():
    resampling = Resampling(scale_x=0.25, scale_y=0.25)
    points = np.array([[0.0, 0.0], [120.3, 80.7], [399.5, 319.5]])
    np.testing.assert_allclose(resampling.to_native(resampling.to_resampled(points)), points, atol=1e-9)


def test_resample_to_gsd_preserves_subpixel_feature_position():
    # A blob at a known sub-pixel position must land where Resampling predicts
    # after shrinking a 0.25 m image to 1 m.
    height, width = 320, 400
    cx, cy, sigma = 120.3, 80.7, 6.0
    yy, xx = np.mgrid[0:height, 0:width]
    image = np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * sigma**2)).astype(np.float32)

    resampled, resampling = resample_to_gsd(image, source_gsd=0.25, target_gsd=1.0)

    assert resampled.shape == (80, 100)
    ry, rx = np.mgrid[0 : resampled.shape[0], 0 : resampled.shape[1]]
    weights = resampled / resampled.sum()
    centroid = np.array([(rx * weights).sum(), (ry * weights).sum()])
    expected = resampling.to_resampled(np.array([[cx, cy]]))[0]
    assert np.hypot(*(centroid - expected)) < 0.05


def _polar_stereographic_geotiff(path, data):
    geo_keys = (1, 1, 0, 3, 1024, 0, 1, 1, 1025, 0, 1, 1, 3072, 0, 1, 32767)
    tifffile.imwrite(
        path,
        data,
        extratags=[
            (33550, 12, 3, (2.0, 2.0, 0.0), True),
            (33922, 12, 6, (0.0, 0.0, 0.0, -1000.0, 5000.0, 0.0), True),
            (34735, 3, len(geo_keys), geo_keys, True),
            (34737, 2, 0, "POLAR_STEREOGRAPHIC MOON|", True),
            (42113, 2, 0, "0", True),
        ],
    )


def test_write_geotiff_round_trips_georeferencing_and_nodata(tmp_path):
    source = np.arange(1, 13, dtype=np.uint16).reshape(3, 4) * 100
    source[0, 0] = 0  # no-data
    _polar_stereographic_geotiff(tmp_path / "reference.tif", source)
    reference = load_image(tmp_path / "reference.tif")

    product = reference.data * 0.5
    write_geotiff(tmp_path / "product.tif", product, reference.metadata)
    reloaded = load_image(tmp_path / "product.tif")

    assert reloaded.source_dtype == "float32"
    assert np.isnan(reloaded.data[0, 0])
    np.testing.assert_allclose(reloaded.data[1:], product[1:])
    for key in ("pixel_size", "origin", "tiepoint_pixel", "pixel_is_point"):
        assert reloaded.metadata[key] == reference.metadata[key]
    with tifffile.TiffFile(tmp_path / "product.tif") as tif:
        assert "POLAR_STEREOGRAPHIC MOON" in tif.pages[0].tags[34737].value


def test_pixel_to_map_uses_pixel_centres(tmp_path):
    _polar_stereographic_geotiff(tmp_path / "reference.tif", np.ones((3, 4), dtype=np.uint16))
    metadata = load_image(tmp_path / "reference.tif").metadata

    # PixelIsArea: the tie point is the corner of pixel (0, 0); its centre is one 2 m pixel's half inside.
    np.testing.assert_allclose(pixel_to_map(np.array([[0.0, 0.0], [3.0, 2.0]]), metadata), [[-999.0, 4999.0], [-993.0, 4995.0]])
    assert pixel_to_map(np.zeros((1, 2)), {}) is None


_PDS4_LABEL = """<?xml version="1.0" encoding="UTF-8"?>
<Product_Observational xmlns="http://pds.nasa.gov/pds4/pds/v1" xmlns:isda="https://isda.issdc.gov.in/pds4/isda/v1">
  <Observation_Area>
    <Mission_Area>
      <isda:Geometry_Parameters>
        <isda:pixel_resolution unit="m/pixel">{gsd}</isda:pixel_resolution>
        <isda:upper_left_latitude unit="deg">-69.30</isda:upper_left_latitude>
        <isda:upper_left_longitude unit="deg">32.30</isda:upper_left_longitude>
      </isda:Geometry_Parameters>
    </Mission_Area>
  </Observation_Area>
  <File_Area_Observational>
    <File><file_name>{file_name}</file_name></File>
    {array}
  </File_Area_Observational>
</Product_Observational>
"""


def test_pds4_spectral_cube_reads_one_band_along_the_band_axis(tmp_path):
    bands, lines, samples = 3, 20, 10
    cube = (np.arange(bands)[:, None, None] * 1000 + np.arange(lines)[None, :, None] * 10 + np.arange(samples)).astype("<u2")
    (tmp_path / "cube.qub").write_bytes(cube.tobytes())
    axes = "".join(
        f"<Axis_Array><axis_name>{name}</axis_name><elements>{n}</elements><sequence_number>{i + 1}</sequence_number></Axis_Array>"
        for i, (name, n) in enumerate([("BAND", bands), ("LINE", lines), ("SAMPLE", samples)])
    )
    bins = "".join(f"<Band_Bin><band_number>{b + 1}</band_number><center_wavelength unit='nm'>{800 + 20 * b}</center_wavelength></Band_Bin>" for b in range(bands))
    array = (
        "<Array_3D_Spectrum><offset unit='byte'>0</offset><axes>3</axes><axis_index_order>Last Index Fastest</axis_index_order>"
        f"<Element_Array><data_type>UnsignedLSB2</data_type></Element_Array>{axes}"
        "</Array_3D_Spectrum>"
    ).replace("<sequence_number>1</sequence_number></Axis_Array>", f"<sequence_number>1</sequence_number><Band_Bin_Set>{bins}</Band_Bin_Set></Axis_Array>")
    (tmp_path / "cube.xml").write_text(_PDS4_LABEL.format(gsd="86.40", file_name="cube.qub", array=array))

    image = load_image(tmp_path / "cube.xml", band=2)

    assert image.shape == (lines, samples)
    np.testing.assert_array_equal(image.data, cube[2].astype(np.float32))
    assert image.metadata["gsd"] == 86.4
    assert image.metadata["center_wavelength_nm"] == 840.0
    assert load_image(tmp_path / "cube.xml").metadata["band"] == 1  # middle band by default


def test_pds4_image_applies_scaling_and_missing_constant(tmp_path):
    raw = np.array([[0, 10, 20], [30, 40, 0]], dtype=">i2")
    (tmp_path / "img.raw").write_bytes(raw.tobytes())
    array = (
        "<Array_2D_Image><offset unit='byte'>0</offset><axes>2</axes><axis_index_order>Last Index Fastest</axis_index_order>"
        "<Element_Array><data_type>SignedMSB2</data_type><scaling_factor>0.5</scaling_factor><value_offset>1</value_offset></Element_Array>"
        "<Axis_Array><axis_name>Line</axis_name><elements>2</elements><sequence_number>1</sequence_number></Axis_Array>"
        "<Axis_Array><axis_name>Sample</axis_name><elements>3</elements><sequence_number>2</sequence_number></Axis_Array>"
        "<Special_Constants><missing_constant>0</missing_constant></Special_Constants></Array_2D_Image>"
    )
    (tmp_path / "img.xml").write_text(_PDS4_LABEL.format(gsd="0.25", file_name="img.raw", array=array))

    image = load_image(tmp_path / "img.xml")

    assert np.isnan(image.data[0, 0]) and np.isnan(image.data[1, 2])
    np.testing.assert_allclose(image.data[0, 1:], [6.0, 11.0])
    assert image.metadata["gsd"] == 0.25 and image.metadata["nodata_pixels"] == 2
