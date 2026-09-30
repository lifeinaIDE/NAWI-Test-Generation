from typing import List, Dict, Any
from app.schemas import Report, ValidationMessage

class ValidationEngine:
    def validate_report(self, report: Report) -> List[ValidationMessage]:
        messages: List[ValidationMessage] = []
        
        # We assume required fields are handled by Pydantic mostly, but we add custom business logic here.
        if report.instrument:
            inst = report.instrument
            if inst.maxCapacity is not None and inst.maxCapacity < 0:
                messages.append(ValidationMessage(level="ERROR", field="instrument.maxCapacity", message="Max capacity cannot be negative."))
            if inst.minCapacity is not None and inst.minCapacity < 0:
                messages.append(ValidationMessage(level="ERROR", field="instrument.minCapacity", message="Min capacity cannot be negative."))
            if inst.maxCapacity is not None and inst.minCapacity is not None:
                if inst.maxCapacity <= inst.minCapacity:
                    messages.append(ValidationMessage(level="ERROR", field="instrument.maxCapacity", message="Max capacity must be greater than min capacity."))
            
            if inst.verificationIntervalE is not None and inst.verificationIntervalE <= 0:
                messages.append(ValidationMessage(level="ERROR", field="instrument.verificationIntervalE", message="e must be positive."))
            if inst.actualIntervalD is not None and inst.actualIntervalD <= 0:
                messages.append(ValidationMessage(level="ERROR", field="instrument.actualIntervalD", message="d must be positive."))
                
            # Cross-field: n = max / e
            if inst.numberOfIntervalsN is not None and inst.maxCapacity is not None and inst.verificationIntervalE is not None and inst.verificationIntervalE > 0:
                expected_n = int(inst.maxCapacity / inst.verificationIntervalE)
                if inst.numberOfIntervalsN != expected_n:
                    messages.append(ValidationMessage(level="WARNING", field="instrument.numberOfIntervalsN", message=f"n ({inst.numberOfIntervalsN}) does not match maxCapacity / e ({expected_n})."))

        if report.environment:
            env = report.environment
            if env.temperatureStart is not None and (env.temperatureStart < -10 or env.temperatureStart > 60):
                messages.append(ValidationMessage(level="ERROR", field="environment.temperatureStart", message="Temperature must be between -10 and 60 °C."))
            if env.temperatureEnd is not None and (env.temperatureEnd < -10 or env.temperatureEnd > 60):
                messages.append(ValidationMessage(level="ERROR", field="environment.temperatureEnd", message="Temperature must be between -10 and 60 °C."))
            if env.relativeHumidity is not None and (env.relativeHumidity < 20 or env.relativeHumidity > 98):
                messages.append(ValidationMessage(level="ERROR", field="environment.relativeHumidity", message="Humidity must be between 20% and 98%."))

        return messages

validation_engine = ValidationEngine()
