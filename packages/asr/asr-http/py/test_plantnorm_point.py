"""'point' is a decimal point only between numbers: 'flash point thirty five' is a property name + 35."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plantnorm  # noqa: E402


def test_flash_point_followed_by_spoken_number_is_not_a_decimal():
    assert plantnorm.fold('flash point thirty five degree celsius') == 'flash point 35 degree celsius'
    assert plantnorm.fold('ఫ్లాష్ పాయింట్ థర్టీ ఫైవ్ డిగ్రీ') == 'ఫ్లాష్ పాయింట్ 35 డిగ్రీ'
    assert plantnorm.fold('pour point minus six') == 'pour point minus six'
    assert plantnorm.fold('dew point twenty two') == 'dew point 22'


def test_real_decimals_still_fold():
    assert plantnorm.fold('pressure twelve point five bar') == 'pressure 12.5 bar'
    assert plantnorm.fold('flash point thirty five point five degree') == 'flash point 35.5 degree'


def test_canonicalize_keeps_property_and_number():
    toks = plantnorm.canonicalize('flash point thirty five degree celsius')
    assert '35' in toks and '0.5' not in toks and 'point' in toks
