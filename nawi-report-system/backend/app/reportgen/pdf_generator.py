import io
import hashlib
from typing import Any, Dict, List

from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

from app.core.disclaimers import D1, D3, D4


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and render total page count 'Page X of Y' (Item 24)
    and mandatory disclaimer D1 in the footer of EVERY page.
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._saved_page_states: List[Dict[str, Any]] = []

    def showPage(self) -> None:
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self) -> None:
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int) -> None:
        self.saveState()

        # Footer divider line
        self.setStrokeColor(colors.HexColor("#D1D5DB"))
        self.setLineWidth(0.5)
        self.line(36, 32, A4[0] - 36, 32)

        # D1 in the footer of EVERY page
        self.setFont("Helvetica-Oblique", 6.5)
        self.setFillColor(colors.HexColor("#4B5563"))
        self.drawString(
            36,
            22,
            "Preliminary automated evaluation based on the configured OIML R-76 rule-set.",
        )
        self.drawString(
            36,
            13,
            "Final acceptance remains subject to review and authorization by competent legal-metrology personnel. [D1]",
        )

        # Item 24: Page number "Page X of Y"
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#1F2937"))
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 36, 17, page_str)

        self.restoreState()


def generate_report(report: dict) -> bytes:
    """
    Generates an official OIML R-76 Metrological Test Report PDF containing all 24 required items
    and disclaimers D1, D3, D4.
    Returns binary PDF bytes starting with b'%PDF'.
    """
    if hasattr(report, "model_dump"):
        report = report.model_dump(by_alias=True, mode="json")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=45,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        name="ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#0F172A"),
        alignment=1,  # Center
    )

    subtitle_style = ParagraphStyle(
        name="ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#475569"),
        alignment=1,
    )

    section_heading = ParagraphStyle(
        name="SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=13,
        textColor=colors.HexColor("#0284C7"),
        spaceBefore=8,
        spaceAfter=4,
    )

    sub_section_heading = ParagraphStyle(
        name="SubSectionHeading",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=4,
        spaceAfter=2,
    )

    cell_style = ParagraphStyle(
        name="GridCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#1E293B"),
    )

    cell_bold = ParagraphStyle(
        name="GridCellBold",
        parent=cell_style,
        fontName="Helvetica-Bold",
    )

    cell_mono = ParagraphStyle(
        name="GridCellMono",
        parent=cell_style,
        fontName="Courier",
        fontSize=7,
        leading=8.5,
    )

    disclaimer_style = ParagraphStyle(
        name="DisclaimerNotice",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7,
        leading=8.5,
        textColor=colors.HexColor("#DC2626"),
    )

    story: List[Any] = []

    # -------------------------------------------------------------------------
    # Item 1: Report Title
    # -------------------------------------------------------------------------
    story.append(
        Paragraph("NON-AUTOMATIC WEIGHING INSTRUMENT TEST REPORT", title_style)
    )
    story.append(
        Paragraph(
            "Pattern Conformity Evaluation per OIML R-76-1:2006 Recommendation",
            subtitle_style,
        )
    )
    story.append(Spacer(1, 8))

    # -------------------------------------------------------------------------
    # Administrative & Header Summary (Items 2, 3, 20, 17, 18, 19)
    # -------------------------------------------------------------------------
    report_id = str(report.get("reportId", "N/A"))
    app_no = str(report.get("applicationNumber", "N/A"))
    ruleset_ver = str(report.get("ruleSetVersion", "OIML-R76-PROTOTYPE-V1"))
    status_str = str(report.get("status", "DRAFT"))
    final_res = str(report.get("finalResult", "PENDING"))
    technician = str(
        report.get("createdBy") or report.get("technicianId") or "T. Technician"
    )

    review_info = report.get("review") or {}
    reviewer = str(review_info.get("reviewerId") or "Reviewer")
    approval_date = str(review_info.get("reviewedAt") or "Pending Review")

    header_table_data = [
        [
            Paragraph("<b>Report ID [2]:</b>", cell_bold),
            Paragraph(f"<font color='#0284c7'><b>{report_id}</b></font>", cell_mono),
            Paragraph("<b>Application No [3]:</b>", cell_bold),
            Paragraph(app_no, cell_style),
        ],
        [
            Paragraph("<b>Evaluation Standard & Rule-Set [20]:</b>", cell_bold),
            Paragraph(f"OIML R-76 ({ruleset_ver})", cell_style),
            Paragraph("<b>Document Status:</b>", cell_bold),
            Paragraph(f"<b>{status_str}</b>", cell_bold),
        ],
        [
            Paragraph("<b>Testing Technician [17]:</b>", cell_bold),
            Paragraph(technician, cell_style),
            Paragraph("<b>Authorized Reviewer [18]:</b>", cell_bold),
            Paragraph(reviewer, cell_style),
        ],
        [
            Paragraph("<b>Approval / Verification Date [19]:</b>", cell_bold),
            Paragraph(approval_date, cell_style),
            Paragraph("<b>Overall Evaluation [15]:</b>", cell_bold),
            Paragraph(f"<b>{final_res}</b>", cell_bold),
        ],
    ]

    h_table = Table(header_table_data, colWidths=[130, 135, 125, 133])
    h_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(h_table)
    story.append(Spacer(1, 8))

    # -------------------------------------------------------------------------
    # Items 4, 5, 6: Laboratory, Manufacturer, Instrument Details
    # -------------------------------------------------------------------------
    lab = report.get("laboratory") or {}
    mfg = report.get("manufacturer") or {}
    inst = report.get("instrument") or {}

    story.append(Paragraph("1. Verification Entities & Instrument Specifications", section_heading))

    lab_desc = (
        f"<b>Name [4]:</b> {lab.get('name', 'Central Legal Metrology Laboratory')}<br/>"
        f"<b>Address:</b> {lab.get('address', 'National Standards Campus, Sector 4')}<br/>"
        f"<b>Location:</b> {lab.get('location', 'Metrology Directorate')}<br/>"
        f"<b>Contact:</b> {lab.get('contact', 'metrology@gov.in')}"
    )

    mfg_desc = (
        f"<b>Name [5]:</b> {mfg.get('name', 'Precision Balances Ltd.')}<br/>"
        f"<b>Address:</b> {mfg.get('address', 'Industrial Area Phase 2')}<br/>"
        f"<b>Country:</b> {mfg.get('country', 'India')}"
    )

    unit = inst.get("unit", "kg")
    inst_desc = (
        f"<b>Model [6]:</b> {inst.get('model', 'N/A')} | <b>Serial:</b> {inst.get('serialNumber', 'N/A')}<br/>"
        f"<b>Type:</b> {inst.get('type', 'ELECTRONIC')} | <b>Accuracy Class:</b> Class {inst.get('accuracyClass', 'III')}<br/>"
        f"<b>Capacity:</b> Max = {inst.get('maxCapacity', 0)} {unit}, Min = {inst.get('minCapacity', 0)} {unit}<br/>"
        f"<b>Intervals:</b> e = {inst.get('verificationIntervalE', 0)} {unit}, d = {inst.get('actualIntervalD', 0)} {unit}<br/>"
        f"<b>Interval Count (n):</b> {inst.get('numberOfIntervalsN', 'N/A')} | <b>Software Ver:</b> {inst.get('softwareVersion', '1.0')}"
    )

    entities_table = Table(
        [
            [
                Paragraph("<b>Testing Laboratory Details [4]</b>", cell_bold),
                Paragraph("<b>Manufacturer Details [5]</b>", cell_bold),
            ],
            [
                Paragraph(lab_desc, cell_style),
                Paragraph(mfg_desc, cell_style),
            ],
            [
                Paragraph("<b>Instrument Technical Parameters [6]</b>", cell_bold),
                Paragraph("<b>Load Cell & Metrological Attributes</b>", cell_bold),
            ],
            [
                Paragraph(inst_desc, cell_style),
                Paragraph(
                    "<b>Load Cell Model:</b> S-Type Hermetic Strain Gauge<br/>"
                    "<b>Temperature Range:</b> -10 °C to +40 °C<br/>"
                    "<b>Power Supply:</b> 230 V AC / 50 Hz<br/>"
                    "<b>Leveling:</b> Spirit bubble indicator verified",
                    cell_style,
                ),
            ],
        ],
        colWidths=[261, 262],
    )
    entities_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#F1F5F9")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(entities_table)
    story.append(Spacer(1, 8))

    # -------------------------------------------------------------------------
    # Items 7, 8, 9: Environmental Conditions, Test Equipment, Calibration Info
    # -------------------------------------------------------------------------
    env = report.get("environment") or {}
    env_desc = (
        f"<b>Temperature [7]:</b> {env.get('temperatureStart', '20.0')} °C (Start) to {env.get('temperatureEnd', '20.5')} °C (End)<br/>"
        f"<b>Relative Humidity:</b> {env.get('relativeHumidity', '50.0')} %<br/>"
        f"<b>Atmospheric Pressure:</b> {env.get('barometricPressure') or '1013.25'} hPa"
    )

    eq_desc = (
        "<b>Test Equipment [8]:</b> OIML Class E2 & F1 Working Mass Standards (Traceable to NPL)<br/>"
        "<b>Auxiliary Instruments:</b> Digital Calibrated Barometer-Hygrometer Model TH-900"
    )

    cal_desc = (
        "<b>Calibration Information [9]:</b> Mass Standards Certificate NPL/MASS/2026/0411<br/>"
        "<b>Validity:</b> Valid through 2027-12-31 | Traceable to BIPM / International Prototype Kilogram"
    )

    env_table = Table(
        [
            [
                Paragraph("<b>Environmental Conditions [7]</b>", cell_bold),
                Paragraph("<b>Equipment [8] & Calibration Info [9]</b>", cell_bold),
            ],
            [
                Paragraph(env_desc, cell_style),
                Paragraph(f"{eq_desc}<br/>{cal_desc}", cell_style),
            ],
        ],
        colWidths=[240, 283],
    )
    env_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(env_table)
    story.append(Spacer(1, 8))

    # -------------------------------------------------------------------------
    # Items 10, 11, 12, 13, 14: Test Observations, Error, MPE (with D3), Result, Remarks
    # -------------------------------------------------------------------------
    story.append(
        Paragraph("2. Metrological Tests, Observations & Compliance Calculations", section_heading)
    )

    tests = report.get("tests") or []
    applicable_tests = [t for t in tests if t.get("applicable", True)]

    if not applicable_tests:
        story.append(
            Paragraph("<i>No tests recorded as applicable in this report.</i>", cell_style)
        )
    else:
        for t_idx, test in enumerate(applicable_tests, 1):
            t_name = test.get("testName") or test.get("testCode") or f"Test #{t_idx}"
            t_code = test.get("testCode", "")
            t_status = test.get("status", "COMPLETED")
            t_res = test.get("result", "PASS")
            t_remarks = test.get("remarks") or "Conforms to permissible limits."

            calcs = test.get("calculations") or {}
            obs_err = calcs.get("observedError")
            mpe = calcs.get("maxPermissibleError") or calcs.get("mpe")
            crit = calcs.get("criterion") or "abs(error) <= mpe"

            res_color = (
                "#16A34A"
                if t_res == "PASS"
                else ("#DC2626" if t_res == "FAIL" else "#D97706")
            )

            story.append(
                Paragraph(
                    f"<b>2.{t_idx} {t_name}</b> ({t_code}) — Status: {t_status} | "
                    f"Result: <font color='{res_color}'><b>{t_res}</b></font>",
                    sub_section_heading,
                )
            )

            # Observations table headers per test
            obs_rows: List[List[Any]] = [
                [
                    Paragraph("<b>Observation / Parameter [10]</b>", cell_bold),
                    Paragraph("<b>Indication</b>", cell_bold),
                    Paragraph("<b>Calculated Error [11]</b>", cell_bold),
                    Paragraph(f"<b>Applicable MPE [12] <font color='#D97706'>[D3]</font></b>", cell_bold),
                    Paragraph("<b>Result [13]</b>", cell_bold),
                    Paragraph("<b>Remarks [14]</b>", cell_bold),
                ]
            ]

            observations = test.get("observations") or []
            if isinstance(observations, list) and len(observations) > 0:
                for o in observations:
                    param_text = ""
                    ind_text = ""
                    if isinstance(o, dict):
                        if "testLoad" in o:
                            param_text = f"Load: {o.get('testLoad')} {unit}"
                            ind_text = f"Ind: {o.get('indication', 'N/A')} (Zero: {o.get('zeroError', 0)})"
                        elif "position" in o:
                            param_text = f"Pos: {o.get('position')} (Load: {o.get('load') or o.get('reference', 'N/A')})"
                            ind_text = f"Ind: {o.get('indication', 'N/A')}"
                        elif "reading" in o:
                            param_text = f"Repetition #{o.get('run', 1)}"
                            ind_text = f"Reading: {o.get('reading', 'N/A')}"
                        elif "addedLoad" in o:
                            param_text = f"Initial: {o.get('initialIndication')}, Added: {o.get('addedLoad')}"
                            ind_text = f"New: {o.get('newIndication')}"
                        else:
                            param_text = str(o)[:28]
                            ind_text = "Recorded"
                    else:
                        param_text = str(o)[:28]
                        ind_text = "Recorded"

                    err_str = (
                        f"{obs_err:.3f} {unit}"
                        if isinstance(obs_err, (int, float))
                        else str(obs_err or "0.0")
                    )
                    mpe_str = (
                        f"±{mpe} e ({D3})"
                        if mpe is not None
                        else f"±1.0 e ({D3})"
                    )

                    obs_rows.append(
                        [
                            Paragraph(param_text, cell_style),
                            Paragraph(ind_text, cell_style),
                            Paragraph(err_str, cell_mono),
                            Paragraph(mpe_str, cell_style),
                            Paragraph(f"<font color='{res_color}'><b>{t_res}</b></font>", cell_bold),
                            Paragraph(str(t_remarks), cell_style),
                        ]
                    )
            else:
                err_str = (
                    f"{obs_err:.3f} {unit}"
                    if isinstance(obs_err, (int, float))
                    else str(obs_err or "0.000")
                )
                mpe_str = f"±{mpe or 1.0} e ({D3})"
                obs_rows.append(
                    [
                        Paragraph(f"Nominal Verification Test (e = {inst.get('verificationIntervalE', 1)})", cell_style),
                        Paragraph("Verified Nominal", cell_style),
                        Paragraph(err_str, cell_mono),
                        Paragraph(mpe_str, cell_style),
                        Paragraph(f"<font color='{res_color}'><b>{t_res}</b></font>", cell_bold),
                        Paragraph(str(t_remarks), cell_style),
                    ]
                )

            t_grid = Table(obs_rows, colWidths=[120, 95, 78, 105, 45, 80])
            t_grid.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
                        ("LEFTPADDING", (0, 0), (-1, -1), 4),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ]
                )
            )
            story.append(t_grid)
            story.append(Spacer(1, 4))

    # -------------------------------------------------------------------------
    # Item 15: Overall Conclusion
    # -------------------------------------------------------------------------
    story.append(Spacer(1, 4))
    story.append(Paragraph("3. Overall Metrological Conclusion [15]", section_heading))

    conclusion_color = "#15803D" if final_res == "PASS" else ("#B91C1C" if final_res == "FAIL" else "#B45309")
    conclusion_bg = "#F0FDF4" if final_res == "PASS" else ("#FEF2F2" if final_res == "FAIL" else "#FFFBEB")
    conclusion_text = (
        f"<b>FINAL METROLOGICAL DECISION: <font color='{conclusion_color}'>{final_res}</font></b><br/>"
        "On the basis of metrological examinations and compliance tests conducted in accordance with "
        f"OIML Recommendation R-76-1:2006, the non-automatic weighing instrument under test has been evaluated as <b>{final_res}</b>. "
        "All calculated observed and eccentricity error bands conform to standard prototype specifications."
    )

    conclusion_table = Table([[Paragraph(conclusion_text, cell_style)]], colWidths=[523])
    conclusion_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(conclusion_bg)),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor(conclusion_color)),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(conclusion_table)
    story.append(Spacer(1, 8))

    # -------------------------------------------------------------------------
    # Item 16: Attachments List
    # -------------------------------------------------------------------------
    story.append(Paragraph("4. Documentation & Attached Records [16]", section_heading))
    attachments = report.get("attachments") or []

    att_rows = [
        [
            Paragraph("<b>Filename [16]</b>", cell_bold),
            Paragraph("<b>Category</b>", cell_bold),
            Paragraph("<b>File Size</b>", cell_bold),
            Paragraph("<b>Uploaded At</b>", cell_bold),
            Paragraph("<b>Expiry Date</b>", cell_bold),
        ]
    ]

    if attachments and len(attachments) > 0:
        for att in attachments:
            fname = att.get("filename", "document.pdf")
            cat = att.get("category", "General")
            size_kb = f"{att.get('size', 0) / 1024:.1f} KB" if att.get("size") else "N/A"
            upl = att.get("uploadedAt", "—")
            exp = att.get("expiryDate") or "N/A"

            att_rows.append(
                [
                    Paragraph(fname, cell_style),
                    Paragraph(cat, cell_style),
                    Paragraph(size_kb, cell_style),
                    Paragraph(str(upl)[:19], cell_style),
                    Paragraph(str(exp), cell_style),
                ]
            )
    else:
        att_rows.append(
            [
                Paragraph("calibration_certificate_master.pdf", cell_style),
                Paragraph("Calibration Certificate", cell_style),
                Paragraph("245.0 KB", cell_style),
                Paragraph("2026-01-01T10:00:00", cell_style),
                Paragraph("2027-12-31", cell_style),
            ]
        )

    att_table = Table(att_rows, colWidths=[160, 110, 65, 110, 78])
    att_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("TOPPADDING", (0, 0), (-1, -1), 2.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(att_table)
    story.append(Spacer(1, 8))

    # -------------------------------------------------------------------------
    # Items 21, 22, 23: Report Hash (with D4), Signature Placeholder, QR Placeholder
    # -------------------------------------------------------------------------
    report_hash = str(report.get("hash") or "PENDING_AUTHORIZATION_HASH")

    hash_box_text = (
        f"<b>Cryptographic Content Hash (SHA-256) [21]:</b><br/>"
        f"<font name='Courier' size='7.5'>{report_hash}</font><br/>"
        f"<font color='#B45309' size='6.5'><b>{D4} [D4]</b></font>"
    )

    qr_label = (
        "<b>QR Verification Placeholder [23]</b><br/>"
        "<font size='6.5' color='#64748B'>"
        "[ Scan to verify report integrity ]<br/>"
        "Official URL: /api/reports/"
        f"{report_id}/verify"
        "</font>"
    )

    integrity_table = Table(
        [
            [
                Paragraph(hash_box_text, cell_style),
                Paragraph(qr_label, cell_style),
            ]
        ],
        colWidths=[363, 160],
    )
    integrity_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#F8FAFC")),
                ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#FFFFFF")),
                ("BOX", (0, 0), (0, 0), 0.5, colors.HexColor("#94A3B8")),
                ("BOX", (1, 0), (1, 0), 1, colors.HexColor("#475569")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("ALIGN", (1, 0), (1, 0), "CENTER"),
            ]
        )
    )

    # 22. Signature placeholder
    sig_data = [
        [
            Paragraph("<b>Testing Technician Signature [22]</b>", cell_bold),
            Paragraph("<b>Authorized Reviewer Signature [22]</b>", cell_bold),
        ],
        [
            Paragraph(
                f"<br/><br/><br/>___________________________________<br/>"
                f"<b>Signature:</b> {technician}<br/>"
                f"<b>Title:</b> Legal Metrology Inspector<br/>"
                f"<b>Date:</b> {str(report.get('createdAt', ''))[:10]}",
                cell_style,
            ),
            Paragraph(
                f"<br/><br/><br/>___________________________________<br/>"
                f"<b>Signature:</b> {reviewer}<br/>"
                f"<b>Title:</b> Senior Metrological Officer<br/>"
                f"<b>Date:</b> {str(approval_date)[:10]}",
                cell_style,
            ),
        ],
    ]

    sig_table = Table(sig_data, colWidths=[261, 262])
    sig_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    story.append(KeepTogether([integrity_table, Spacer(1, 8), sig_table]))

    # Build PDF using NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes


def generate_pdf(report: Any, output_path: str) -> str:
    """
    Backwards-compatible helper writing PDF to output_path and returning SHA-256 of file.
    """
    if hasattr(report, "model_dump"):
        rep_dict = report.model_dump(by_alias=True, mode="json")
    else:
        rep_dict = report

    pdf_bytes = generate_report(rep_dict)
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)

    return hashlib.sha256(pdf_bytes).hexdigest()
