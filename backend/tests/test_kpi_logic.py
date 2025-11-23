import pytest

from kpix_backend.core.enums import KpiDirection, KpiValueStatus
from kpix_backend.core.kpi_logic import compute_status, validate_thresholds


def test_compute_status_upward_direction():
    assert compute_status(KpiDirection.UP_IS_BETTER, 90, 75, 95) == KpiValueStatus.GREEN
    assert compute_status(KpiDirection.UP_IS_BETTER, 90, 75, 80) == KpiValueStatus.ORANGE
    assert compute_status(KpiDirection.UP_IS_BETTER, 90, 75, 60) == KpiValueStatus.RED


def test_compute_status_downward_direction():
    assert compute_status(KpiDirection.DOWN_IS_BETTER, 10, 20, 5) == KpiValueStatus.GREEN
    assert compute_status(KpiDirection.DOWN_IS_BETTER, 10, 20, 15) == KpiValueStatus.ORANGE
    assert compute_status(KpiDirection.DOWN_IS_BETTER, 10, 20, 40) == KpiValueStatus.RED


def test_validate_thresholds_rejects_invalid_setup():
    with pytest.raises(ValueError):
        validate_thresholds(KpiDirection.UP_IS_BETTER, threshold_green=50, threshold_orange=60, threshold_red=10)
