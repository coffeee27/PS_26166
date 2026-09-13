def assess_registration_quality(metrics):
    """
    Assess the reliability of a registration result.

    Returns:
        status: overall registration status
        subpixel_accuracy: whether the strict sub-pixel target was achieved
        reasons: explanation of any quality issues
    """

    # Temporary baseline thresholds.
    # These should be tuned using a larger lunar-image test set.
    rmse_threshold = 3.0
    subpixel_threshold = 1.0
    inlier_ratio_threshold = 0.20
    spatial_coverage_threshold = 0.25

    reasons = []

    # Overall geometric quality
    if metrics["rmse"] > rmse_threshold:
        reasons.append("RMSE is too high")

    if metrics["inlier_ratio"] < inlier_ratio_threshold:
        reasons.append("Inlier ratio is too low")

    if metrics["spatial_coverage"] < spatial_coverage_threshold:
        reasons.append("Spatial coverage is too low")

    # Strict SIH sub-pixel target
    subpixel_accuracy = metrics["rmse"] <= subpixel_threshold

    if subpixel_accuracy:
        subpixel_status = "ACHIEVED"
    else:
        subpixel_status = "NOT_ACHIEVED"

    # Overall registration decision
    if reasons:
        status = "REJECTED"
    else:
        status = "ACCEPTED"

    return {
        "status": status,
        "subpixel_accuracy": subpixel_status,
        "reasons": reasons
    }