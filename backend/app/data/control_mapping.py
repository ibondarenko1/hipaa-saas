"""
Maps seed control_code (A1-01, etc.) to frontend hipaaEvidence controlId (HIPAA-GV-01, etc.).
Used by seed script and answers API to filter questions by control.
"""
# Seed control_code -> hipaaEvidence controlId (41 HIPAA evidence controls)
CONTROL_CODE_TO_HIPAA_ID = {
    "A1-01": "HIPAA-ID-01",   # Risk Analysis
    "A1-02": "HIPAA-ID-02",   # Risk Management
    "A2-03": "HIPAA-GV-01",   # Assigned Security Responsibility
    "A2-04": "HIPAA-GV-03",   # Policies and Procedures
    "A2-05": "HIPAA-GV-04",   # Documentation
    "A3-06": "HIPAA-PR-01",   # Workforce Authorization
    "A3-07": "HIPAA-PR-03",   # Workforce Termination
    "A4-08": "HIPAA-PR-04",   # Information Access Management
    "A4-09": "HIPAA-PR-05",   # Access Authorization
    "A5-10": "HIPAA-PR-06",   # Security Awareness and Training
    "A5-11": "HIPAA-PR-06",   # Training records (same control)
    "A6-12": "HIPAA-RS-01",   # Security Incident Procedures
    "A6-13": "HIPAA-RS-02",   # Response and Reporting
    "A6-14": "HIPAA-RS-01",   # Incident logging (same)
    "A7-15": "HIPAA-RC-01",   # Data Backup Plan
    "A7-16": "HIPAA-RC-02",   # Disaster Recovery Plan
    "A7-17": "HIPAA-RC-03",   # Emergency Mode Operation
    "B1-18": "HIPAA-PR-09",   # Facility Access Controls
    "B1-19": "HIPAA-PR-10",   # Facility Security Plan
    "B2-20": "HIPAA-PR-12",   # Workstation Use
    "B2-21": "HIPAA-PR-13",   # Workstation Security
    "B3-22": "HIPAA-PR-14",   # Disposal
    "B3-23": "HIPAA-PR-15",   # Media Re-use
    "B3-24": "HIPAA-PR-14",   # Lost/stolen (same)
    "C1-25": "HIPAA-PR-16",   # Unique User Identification
    "C1-26": "HIPAA-PR-17",   # Emergency Access Procedure
    "C1-27": "HIPAA-PR-17",   # Emergency access (same)
    "C2-28": "HIPAA-DE-03",   # Audit Controls
    "C2-29": "HIPAA-DE-02",   # Log-in Monitoring
    "C2-30": "HIPAA-DE-01",   # Information System Activity Review
    "C3-31": "HIPAA-PR-20",   # Integrity
    "C3-32": "HIPAA-PR-07",   # Protection from Malicious Software
    "C4-33": "HIPAA-PR-19",   # Encryption and Decryption
    "C4-34": "HIPAA-PR-22",   # Transmission Security
    "C5-35": "HIPAA-PR-08",   # Password Management
    "C5-36": "HIPAA-PR-08",   # Password/account lockout (same)
    "D1-37": "HIPAA-GV-02",   # Business Associate Contracts
    "D1-38": "HIPAA-GV-02",   # BAAs (same)
    "D2-39": "HIPAA-GV-05",   # Retention
    "D2-40": "HIPAA-GV-05",   # Vendor access review (same)
}
