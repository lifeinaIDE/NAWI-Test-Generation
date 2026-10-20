"""
NAWI Report System — Pydantic Schemas (Phase 1 Stub)

Field names are camelCase throughout and MUST match frontend/src/types/index.ts exactly.
Backend uses Field(alias=...) so JSON serialisation stays camelCase even with Python
snake_case attribute names where needed.

Error-handling convention (applies to all 4xx responses):
  { "detail": [ { "level": "ERROR|WARNING|INFO", "field": "...", "message": "..." } ] }
"""

from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field


from pydantic.alias_generators import to_camel


# ---------------------------------------------------------------------------
# Shared config — all schemas serialise with camelCase alias population
# ---------------------------------------------------------------------------
class CamelModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )


class Attachment(CamelModel):
    id: str = Field(..., alias="id")
    filename: str = Field(..., alias="filename")
    type: str = Field(default="image/jpeg", alias="type")
    size: int = Field(default=0, alias="size")
    uploadedAt: str = Field(default="", alias="uploadedAt")


# ---------------------------------------------------------------------------
# Primitives
# ---------------------------------------------------------------------------
class ValidationMessage(CamelModel):
    level: str = Field(..., alias="level")          # "ERROR" | "WARNING" | "INFO"
    field: str = Field(..., alias="field")
    message: str = Field(..., alias="message")


class ErrorResponse(CamelModel):
    detail: list[ValidationMessage]


# ---------------------------------------------------------------------------
# User / Auth
# ---------------------------------------------------------------------------
Role = str  # "TECHNICIAN" | "REVIEWER" | "ADMIN" | "VIEWER"


class User(CamelModel):
    userId: str = Field(..., alias="userId")
    username: str = Field(..., alias="username")
    displayName: str = Field(default="", alias="displayName")
    role: Role = Field(..., alias="role")
    active: bool = Field(default=True, alias="active")
    laboratory: str = Field(default="Central Legal Metrology Laboratory", alias="laboratory")

    def __init__(self, **data):
        if "id" in data and "userId" not in data:
            data["userId"] = data["id"]
        super().__init__(**data)

    @property
    def id(self) -> str:
        return self.userId


class LoginRequest(CamelModel):
    username: str = Field(..., alias="username")
    password: str = Field(..., alias="password")


class LoginResponse(CamelModel):
    token: str = Field(..., alias="token")
    user: User = Field(..., alias="user")


# ---------------------------------------------------------------------------
# Instrument / Lab / Environment
# ---------------------------------------------------------------------------
class Laboratory(CamelModel):
    name: str = Field(default="", alias="name")
    address: str = Field(default="", alias="address")
    location: str = Field(default="", alias="location")
    contact: str = Field(default="", alias="contact")


class Manufacturer(CamelModel):
    name: str = Field(default="", alias="name")
    address: str = Field(default="", alias="address")
    country: str = Field(default="", alias="country")


class Instrument(CamelModel):
    model: str = Field(default="", alias="model")
    serialNumber: str = Field(default="", alias="serialNumber")
    type: str = Field(default="", alias="type")
    accuracyClass: str = Field(default="III", alias="accuracyClass")
    maxCapacity: float = Field(default=0.0, alias="maxCapacity")
    minCapacity: float = Field(default=0.0, alias="minCapacity")
    verificationIntervalE: float = Field(default=0.0, alias="verificationIntervalE")
    actualIntervalD: float = Field(default=0.0, alias="actualIntervalD")
    numberOfIntervalsN: float = Field(default=0.0, alias="numberOfIntervalsN")
    unit: str = Field(default="kg", alias="unit")
    softwareVersion: str = Field(default="", alias="softwareVersion")
    loadCell: dict[str, Any] = Field(default_factory=dict, alias="loadCell")


class Environment(CamelModel):
    temperatureStart: float = Field(default=0.0, alias="temperatureStart")
    temperatureEnd: float = Field(default=0.0, alias="temperatureEnd")
    relativeHumidity: float = Field(default=0.0, alias="relativeHumidity")
    barometricPressure: Optional[float] = Field(default=None, alias="barometricPressure")


# ---------------------------------------------------------------------------
# Tests & Calculations
# ---------------------------------------------------------------------------
class TestObservation(CamelModel):
    key: str = Field(default="", alias="key")
    value: Any = Field(default=None, alias="value")
    unit: str = Field(default="", alias="unit")


class CalculationResult(CamelModel):
    result: str = Field(default="INCOMPLETE", alias="result")
    # "PASS" | "FAIL" | "WARNING" | "INCOMPLETE" | "NOT_APPLICABLE"
    observedError: Optional[float] = Field(default=None, alias="observedError")
    correctedError: Optional[float] = Field(default=None, alias="correctedError")
    maxPermissibleError: Optional[float] = Field(default=None, alias="maxPermissibleError")
    mpe: Optional[float] = Field(default=None, alias="mpe")
    mpeInE: Optional[float] = Field(default=None, alias="mpeInE")
    formulaUsed: str = Field(default="", alias="formulaUsed")
    ruleSetVersion: str = Field(default="", alias="ruleSetVersion")
    criterion: Optional[str] = Field(default=None, alias="criterion")
    failureReason: Optional[str] = Field(default=None, alias="failureReason")
    messages: list[str] = Field(default_factory=list, alias="messages")
    details: dict[str, Any] = Field(default_factory=dict, alias="details")


class TestDefinition(CamelModel):
    testCode: str = Field(..., alias="testCode")
    testName: str = Field(..., alias="testName")
    applicable: bool = Field(default=True, alias="applicable")
    status: str = Field(default="INCOMPLETE", alias="status")
    # "INCOMPLETE" | "COMPLETED" | "PLANNED" | "NOT_APPLICABLE"
    observations: list[Any] = Field(default_factory=list, alias="observations")
    calculations: dict[str, Any] = Field(default_factory=dict, alias="calculations")
    result: str = Field(default="INCOMPLETE", alias="result")
    remarks: str = Field(default="", alias="remarks")


# ---------------------------------------------------------------------------
# Audit
# ---------------------------------------------------------------------------
class AuditEvent(CamelModel):
    eventId: Optional[str] = Field(default=None, alias="eventId")
    userId: str = Field(..., alias="userId")
    role: Optional[str] = Field(default=None, alias="role")
    userRole: Optional[str] = Field(default=None, alias="userRole")
    action: str = Field(..., alias="action")
    reportId: Optional[str] = Field(default=None, alias="reportId")
    fromStatus: Optional[str] = Field(default=None, alias="fromStatus")
    toStatus: Optional[str] = Field(default=None, alias="toStatus")
    comment: Optional[str] = Field(default=None, alias="comment")
    timestamp: str = Field(..., alias="timestamp")
    ruleSetVersion: Optional[str] = Field(default=None, alias="ruleSetVersion")


# ---------------------------------------------------------------------------
# Review
# ---------------------------------------------------------------------------
class ReviewInfo(CamelModel):
    reviewerId: Optional[str] = Field(default=None, alias="reviewerId")
    reviewerComments: str = Field(default="", alias="reviewerComments")
    reviewedAt: Optional[str] = Field(default=None, alias="reviewedAt")


# ---------------------------------------------------------------------------
# Report (core entity)
# ---------------------------------------------------------------------------
class Report(CamelModel):
    reportId: str = Field(..., alias="reportId")
    title: str = Field(default="", alias="title")
    applicationNumber: str = Field(default="", alias="applicationNumber")
    status: str = Field(default="DRAFT", alias="status")
    reportVersion: int = Field(default=1, alias="reportVersion")
    ruleSetVersion: str = Field(default="", alias="ruleSetVersion")
    createdBy: str = Field(default="", alias="createdBy")
    technicianId: Optional[str] = Field(default=None, alias="technicianId")
    createdAt: str = Field(default="", alias="createdAt")
    updatedAt: str = Field(default="", alias="updatedAt")
    laboratory: Laboratory = Field(default_factory=Laboratory, alias="laboratory")
    manufacturer: Manufacturer = Field(default_factory=Manufacturer, alias="manufacturer")
    instrument: Instrument = Field(default_factory=Instrument, alias="instrument")
    environment: Environment = Field(default_factory=Environment, alias="environment")
    tests: list[TestDefinition] = Field(default_factory=list, alias="tests")
    attachments: list[dict[str, Any]] = Field(default_factory=list, alias="attachments")
    review: ReviewInfo = Field(default_factory=ReviewInfo, alias="review")
    finalResult: str = Field(default="PENDING", alias="finalResult")
    hash: Optional[str] = Field(default=None, alias="hash")
    auditEvents: list[str] = Field(default_factory=list, alias="auditEvents")


class CreateReportRequest(CamelModel):
    instrument: Instrument = Field(..., alias="instrument")
    manufacturer: Manufacturer = Field(..., alias="manufacturer")
    laboratory: Laboratory = Field(..., alias="laboratory")


# ---------------------------------------------------------------------------
# Rule-Set
# ---------------------------------------------------------------------------
class RuleSet(CamelModel):
    ruleSetId: str = Field(..., alias="ruleSetId")
    standard: str = Field(..., alias="standard")
    edition: str = Field(..., alias="edition")
    effectiveFrom: str = Field(..., alias="effectiveFrom")
    changeNotes: str = Field(default="", alias="changeNotes")
    status: str = Field(default="ACTIVE", alias="status")
    createdBy: str = Field(default="system", alias="createdBy")
    createdAt: str = Field(default="", alias="createdAt")
    warningRatio: Optional[float] = Field(default=None, alias="warningRatio")
    mpeRules: dict[str, Any] = Field(default_factory=dict, alias="mpeRules")
    testRules: dict[str, Any] = Field(default_factory=dict, alias="testRules")
    isActive: bool = Field(default=False, alias="isActive")
    isLocked: bool = Field(default=False, alias="isLocked")


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
class DashboardSummary(CamelModel):
    total: int = Field(default=0, alias="total")
    drafts: int = Field(default=0, alias="drafts")
    inProgress: int = Field(default=0, alias="inProgress")
    submittedForReview: int = Field(default=0, alias="submittedForReview")
    queryRaised: int = Field(default=0, alias="queryRaised")
    approved: int = Field(default=0, alias="approved")
    rejected: int = Field(default=0, alias="rejected")


class DashboardStatistics(CamelModel):
    passRate: float = Field(default=0.0, alias="passRate")
    failRate: float = Field(default=0.0, alias="failRate")
    reportsByModel: list[dict[str, Any]] = Field(default_factory=list, alias="reportsByModel")
    recentActivity: list[Union[AuditEvent, dict[str, Any]]] = Field(default_factory=list, alias="recentActivity")
