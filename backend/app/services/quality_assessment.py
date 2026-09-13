def assess_registration_quality(metrics):
    """
    Assess whether a registration result is reliable.

    Returns:
        status: ACCEPTED or REJECTED
        reasons: explanation for the decision
    """

    # Temporary baseline thresholds.
    # These should be tuned using a larger lunar-image test set.
    rmse_threshold = 3.0
    subpixel_threshold = 1.0
    inlier_ratio_threshold = 0.20
    spatial_coverage_threshold = 0.25

    reasons = []

    if metrics["rmse"] > rmse_threshold:
        reasons.append("RMSE is too high")

    if metrics["rmse"] > subpixel_threshold:
        reasons.append("Sub-pixel accuracy not achieved")    

    if metrics["inlier_ratio"] < inlier_ratio_threshold:
        reasons.append("Inlier ratio is too low")

    if metrics["spatial_coverage"] < spatial_coverage_threshold:
        reasons.append("Spatial coverage is too low")

    if reasons:
        status = "REJECTED"
    else:
        status = "ACCEPTED"

    return {
        "status": status,
        "reasons": reasons
    }