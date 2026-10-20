from datetime import datetime
from typing import List, Optional
from app.schemas import Report, ValidationMessage


class ValidationEngine:
    def validate_report(self, report: Report, is_submit: bool = False) -> List[ValidationMessage]:
        messages: List[ValidationMessage] = []

        # 1. Instrument validation
        max_cap: Optional[float] = None
        if report.instrument:
            inst = report.instrument

            # Numeric types & capacity checks
            if inst.maxCapacity is not None and inst.maxCapacity < 0:
                messages.append(ValidationMessage(
                    level="ERROR",
                    field="instrument.maxCapacity",
                    message="Max capacity cannot be negative."
                ))
            else:
                max_cap = inst.maxCapacity

            if inst.minCapacity is not None and inst.minCapacity < 0:
                messages.append(ValidationMessage(
                    level="ERROR",
                    field="instrument.minCapacity",
                    message="Min capacity cannot be negative."
                ))

            if (inst.maxCapacity is not None and inst.minCapacity is not None
                    and inst.maxCapacity > 0 and inst.minCapacity > 0):
                if inst.maxCapacity <= inst.minCapacity:
                    messages.append(ValidationMessage(
                        level="ERROR",
                        field="instrument.maxCapacity",
                        message="Max capacity must be greater than min capacity."
                    ))

            # Interval positive checks
            if inst.verificationIntervalE is not None and inst.verificationIntervalE < 0:
                messages.append(ValidationMessage(
                    level="ERROR",
                    field="instrument.verificationIntervalE",
                    message="e must be positive."
                ))
            elif is_submit and (inst.verificationIntervalE is None or inst.verificationIntervalE <= 0):
                messages.append(ValidationMessage(
                    level="ERROR",
                    field="instrument.verificationIntervalE",
                    message="e must be positive."
                ))

            if inst.actualIntervalD is not None and inst.actualIntervalD < 0:
                messages.append(ValidationMessage(
                    level="ERROR",
                    field="instrument.actualIntervalD",
                    message="d must be positive."
                ))
            elif is_submit and (inst.actualIntervalD is None or inst.actualIntervalD <= 0):
                messages.append(ValidationMessage(
                    level="ERROR",
                    field="instrument.actualIntervalD",
                    message="d must be positive."
                ))

            # d <= e check: "d must not be greater than e."
            if inst.actualIntervalD is not None and inst.verificationIntervalE is not None:
                if inst.actualIntervalD > 0 and inst.verificationIntervalE > 0:
                    if inst.actualIntervalD > inst.verificationIntervalE:
                        messages.append(ValidationMessage(
                            level="ERROR",
                            field="instrument.actualIntervalD",
                            message="d must not be greater than e."
                        ))

            # Server-side n check for consistency: n = maxCapacity / e
            if (inst.maxCapacity is not None and inst.verificationIntervalE is not None
                    and inst.verificationIntervalE > 0 and inst.maxCapacity > 0):
                expected_n = int(round(inst.maxCapacity / inst.verificationIntervalE))
                if inst.numberOfIntervalsN is not None and inst.numberOfIntervalsN > 0:
                    if int(round(inst.numberOfIntervalsN)) != expected_n:
                        level = "ERROR" if is_submit else "WARNING"
                        messages.append(ValidationMessage(
                            level=level,
                            field="instrument.numberOfIntervalsN",
                            message=f"n ({int(round(inst.numberOfIntervalsN))}) does not match maxCapacity / e ({expected_n})."
                        ))

        # 2. Environmental conditions validation
        if report.environment:
            env = report.environment
            env_level = "ERROR" if is_submit else "WARNING"

            if env.temperatureStart is not None and env.temperatureStart != 0.0:
                if env.temperatureStart < -10 or env.temperatureStart > 60:
                    messages.append(ValidationMessage(
                        level=env_level,
                        field="environment.temperatureStart",
                        message="Temperature must be between -10 and 60 °C."
                    ))
            elif is_submit and (env.temperatureStart is None or env.temperatureStart == 0.0):
                messages.append(ValidationMessage(
                    level="ERROR",
                    field="environment.temperatureStart",
                    message="Starting temperature is required."
                ))

            if env.temperatureEnd is not None and env.temperatureEnd != 0.0:
                if env.temperatureEnd < -10 or env.temperatureEnd > 60:
                    messages.append(ValidationMessage(
                        level=env_level,
                        field="environment.temperatureEnd",
                        message="Temperature must be between -10 and 60 °C."
                    ))
            elif is_submit and (env.temperatureEnd is None or env.temperatureEnd == 0.0):
                messages.append(ValidationMessage(
                    level="ERROR",
                    field="environment.temperatureEnd",
                    message="Ending temperature is required."
                ))

            if env.relativeHumidity is not None and env.relativeHumidity != 0.0:
                if env.relativeHumidity < 20 or env.relativeHumidity > 98:
                    messages.append(ValidationMessage(
                        level=env_level,
                        field="environment.relativeHumidity",
                        message="Humidity must be between 20% and 98%."
                    ))
            elif is_submit and (env.relativeHumidity is None or env.relativeHumidity == 0.0):
                messages.append(ValidationMessage(
                    level="ERROR",
                    field="environment.relativeHumidity",
                    message="Relative humidity is required."
                ))

        # 3. Calibration Certificate Expiry check: "Calibration certificate must not be expired" as ERROR
        today_date = datetime.utcnow().date()
        for att in report.attachments or []:
            expiry_str = att.get("expiryDate") if isinstance(att, dict) else getattr(att, "expiryDate", None)
            if expiry_str:
                try:
                    exp_date = datetime.strptime(expiry_str[:10], "%Y-%m-%d").date()
                    if exp_date < today_date:
                        messages.append(ValidationMessage(
                            level="ERROR",
                            field="attachments.calibrationCertificate",
                            message="Calibration certificate must not be expired."
                        ))
                except (ValueError, TypeError):
                    pass

        # 4. Test load within capacity & Test data shape per test
        REQUIRED_ECCENTRICITY_POSITIONS = {"CENTER", "FRONT_LEFT", "FRONT_RIGHT", "REAR_LEFT", "REAR_RIGHT"}

        for test in report.tests or []:
            if not getattr(test, "applicable", True):
                continue

            test_code = getattr(test, "testCode", "")
            observations = getattr(test, "observations", [])
            level_shape = "ERROR" if is_submit else "WARNING"

            # 4a. Weighing Performance
            if test_code == "WEIGHING_PERFORMANCE":
                if not observations:
                    messages.append(ValidationMessage(
                        level=level_shape,
                        field="tests.WEIGHING_PERFORMANCE",
                        message="Weighing performance requires testLoad and indication observations."
                    ))
                else:
                    first_obs = observations[0] if isinstance(observations, list) else {}
                    t_load = first_obs.get("testLoad") if isinstance(first_obs, dict) else getattr(first_obs, "testLoad", None)
                    ind = first_obs.get("indication") if isinstance(first_obs, dict) else getattr(first_obs, "indication", None)

                    if t_load is None or ind is None:
                        messages.append(ValidationMessage(
                            level=level_shape,
                            field="tests.WEIGHING_PERFORMANCE",
                            message="Weighing performance requires numeric testLoad and indication."
                        ))
                    elif max_cap is not None and max_cap > 0:
                        try:
                            if float(t_load) > max_cap:
                                messages.append(ValidationMessage(
                                    level="ERROR",
                                    field="tests.WEIGHING_PERFORMANCE.testLoad",
                                    message=f"Test load ({t_load}) exceeds instrument maximum capacity ({max_cap})."
                                ))
                        except (ValueError, TypeError):
                            pass

            # 4b. Eccentricity
            elif test_code == "ECCENTRICITY":
                if not observations or len(observations) < 5:
                    messages.append(ValidationMessage(
                        level=level_shape,
                        field="tests.ECCENTRICITY",
                        message="Eccentricity test requires observations for 5 positions (CENTER, FRONT_LEFT, FRONT_RIGHT, REAR_LEFT, REAR_RIGHT)."
                    ))
                else:
                    found_positions = set()
                    for obs in observations:
                        pos = obs.get("position") if isinstance(obs, dict) else getattr(obs, "position", "")
                        ref = obs.get("reference") if isinstance(obs, dict) else getattr(obs, "reference", None)
                        if ref is None:
                            ref = obs.get("load") if isinstance(obs, dict) else getattr(obs, "load", None)
                        ind = obs.get("indication") if isinstance(obs, dict) else getattr(obs, "indication", None)
                        if pos:
                            found_positions.add(pos)
                        if ref is None or ind is None:
                            messages.append(ValidationMessage(
                                level=level_shape,
                                field=f"tests.ECCENTRICITY.{pos}",
                                message=f"Eccentricity position '{pos}' requires reference and indication values."
                            ))
                        elif max_cap is not None and max_cap > 0:
                            try:
                                if float(ref) > max_cap:
                                    messages.append(ValidationMessage(
                                        level="ERROR",
                                        field=f"tests.ECCENTRICITY.{pos}",
                                        message=f"Eccentricity test load ({ref}) exceeds instrument maximum capacity ({max_cap})."
                                    ))
                            except (ValueError, TypeError):
                                pass

                    if not REQUIRED_ECCENTRICITY_POSITIONS.issubset(found_positions):
                        missing_pos = REQUIRED_ECCENTRICITY_POSITIONS - found_positions
                        messages.append(ValidationMessage(
                            level=level_shape,
                            field="tests.ECCENTRICITY.positions",
                            message=f"Eccentricity test missing required positions: {', '.join(sorted(missing_pos))}."
                        ))

            # 4c. Repeatability
            elif test_code == "REPEATABILITY":
                # Check for test load and readings
                details = getattr(test, "calculations", {}).get("details", {}) if isinstance(getattr(test, "calculations", {}), dict) else {}
                t_load = details.get("testLoad")
                readings = []

                if isinstance(observations, list):
                    for obs in observations:
                        if isinstance(obs, dict):
                            if "reading" in obs and obs["reading"] is not None and obs["reading"] != "":
                                readings.append(obs["reading"])
                            if "testLoad" in obs and obs["testLoad"] is not None:
                                t_load = obs["testLoad"]
                        else:
                            val = getattr(obs, "value", None)
                            if val is not None:
                                readings.append(val)

                if len(readings) < 2:
                    messages.append(ValidationMessage(
                        level=level_shape,
                        field="tests.REPEATABILITY",
                        message="Repeatability test requires a test load and at least 2 readings."
                    ))

                if t_load is not None and max_cap is not None and max_cap > 0:
                    try:
                        if float(t_load) > max_cap:
                            messages.append(ValidationMessage(
                                level="ERROR",
                                field="tests.REPEATABILITY.testLoad",
                                message=f"Repeatability test load ({t_load}) exceeds instrument maximum capacity ({max_cap})."
                            ))
                    except (ValueError, TypeError):
                        pass

            # 4d. Discrimination
            elif test_code == "DISCRIMINATION":
                first_obs = observations[0] if (isinstance(observations, list) and observations) else {}
                init_ind = first_obs.get("initialIndication") if isinstance(first_obs, dict) else getattr(first_obs, "initialIndication", None)
                added = first_obs.get("addedLoad") if isinstance(first_obs, dict) else getattr(first_obs, "addedLoad", None)
                new_ind = first_obs.get("newIndication") if isinstance(first_obs, dict) else getattr(first_obs, "newIndication", None)

                if init_ind is None or added is None or new_ind is None:
                    messages.append(ValidationMessage(
                        level=level_shape,
                        field="tests.DISCRIMINATION",
                        message="Discrimination test requires initialIndication, addedLoad, and newIndication."
                    ))

        # 5. Required fields on submit
        if is_submit:
            if not report.applicationNumber or not report.applicationNumber.strip():
                messages.append(ValidationMessage(
                    level="ERROR",
                    field="applicationNumber",
                    message="Application number is required."
                ))
            if not report.laboratory or not report.laboratory.name.strip():
                messages.append(ValidationMessage(
                    level="ERROR",
                    field="laboratory.name",
                    message="Laboratory name is required."
                ))
            if not report.instrument or not report.instrument.model.strip():
                messages.append(ValidationMessage(
                    level="ERROR",
                    field="instrument.model",
                    message="Instrument model is required."
                ))
            if not report.instrument or not report.instrument.serialNumber.strip():
                messages.append(ValidationMessage(
                    level="ERROR",
                    field="instrument.serialNumber",
                    message="Serial number is required."
                ))

        return messages


validation_engine = ValidationEngine()
