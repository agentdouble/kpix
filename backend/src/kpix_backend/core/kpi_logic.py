from kpix_backend.core.enums import KpiDirection, KpiValueStatus


def validate_thresholds(
    direction: KpiDirection, threshold_green: float, threshold_orange: float, threshold_red: float
) -> None:
    if direction == KpiDirection.UP_IS_BETTER:
        if not (threshold_green >= threshold_orange >= threshold_red):
            raise ValueError("Thresholds must satisfy green >= orange >= red for upward KPIs")
    else:
        if not (threshold_green <= threshold_orange <= threshold_red):
            raise ValueError("Thresholds must satisfy green <= orange <= red for downward KPIs")


def compute_status(
    direction: KpiDirection, threshold_green: float, threshold_orange: float, value: float
) -> KpiValueStatus:
    if direction == KpiDirection.UP_IS_BETTER:
        if value >= threshold_green:
            return KpiValueStatus.GREEN
        if value >= threshold_orange:
            return KpiValueStatus.ORANGE
        return KpiValueStatus.RED

    if value <= threshold_green:
        return KpiValueStatus.GREEN
    if value <= threshold_orange:
        return KpiValueStatus.ORANGE
    return KpiValueStatus.RED
