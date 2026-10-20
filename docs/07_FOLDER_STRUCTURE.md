# 7. Folder Structure

Monorepo layout, one repo containing both apps:

```
nawi-report-system/
├── frontend/
│   ├── src/
│   │   ├── pages/            # Login, Dashboard, Repository, ReviewPage, RuleAdmin
│   │   ├── wizard/            # 7-step create-report wizard, one component per step
│   │   │   ├── Step1Metadata.tsx
│   │   │   ├── Step2InstrumentDetails.tsx
│   │   │   ├── Step3Environment.tsx
│   │   │   ├── Step4TestSelection.tsx
│   │   │   ├── Step5TestDataEntry.tsx
│   │   │   ├── Step6Attachments.tsx
│   │   │   └── Step7ReviewAndSubmit.tsx
│   │   ├── components/        # shared UI: StatusBadge, PassFailIndicator, etc.
│   │   ├── api/                # typed API client functions, one file per resource
│   │   ├── types/              # TS interfaces mirrored from backend schemas
│   │   ├── hooks/
│   │   └── App.tsx
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/                # FastAPI routers: auth, reports, calculations, rules, attachments, audit, dashboard
│   │   ├── services/            # report_service.py, instrument_service.py, calculation_engine.py, rule_engine.py, ...
│   │   ├── repositories/        # interfaces + json_* implementations (json_report_repository.py, etc.)
│   │   ├── schemas/             # Pydantic models — mirrors frontend/src/types field-for-field
│   │   ├── rules/                # rule-set loading + versioning logic
│   │   ├── reportgen/            # pdf_generator.py, (future) docx_generator.py
│   │   ├── core/                  # config.py, security.py, auth.py
│   │   └── main.py
│   ├── storage/                   # local data root (gitignored except .gitkeep)
│   │   ├── reports/
│   │   ├── attachments/
│   │   ├── generated-reports/
│   │   ├── rules/
│   │   ├── users/
│   │   ├── audit/
│   │   └── templates/
│   ├── tests/                     # backend unit + integration tests
│   └── requirements.txt
│
├── docs/                            # this baseline documentation set
└── README.md
```

## Naming/consistency rule

Every field name used in `backend/app/schemas/` must match the corresponding field name
in `frontend/src/types/` exactly (see `09_DATA_MODEL.md`). This is what keeps the API
contract self-documenting and avoids silent mapping bugs.
