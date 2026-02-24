// ============================================================
// HIPAA Evidence Framework — Small Practice Edition
// Auto-generated from HIPAA_Evidence_Framework_SmallPractice.xlsx
// Place this file in: src/data/hipaaEvidence.ts
// ============================================================

export type SafeguardType = 'Administrative' | 'Physical' | 'Technical';
export type ReqType = 'Required' | 'Addressable';
export type EvidenceStatus = 'not_started' | 'in_progress' | 'collected' | 'not_applicable';

export interface HIPAAControl {
  id: number;
  controlId: string;
  controlName: string;
  hipaaCitation: string;
  safeguardType: SafeguardType;
  reqType: ReqType;
  primaryArtifact: string;
  whatToCollect: string;
  practicalSteps: string;
  evidenceFormat: string;
  frequency: string;
  applicable: string;
}

export interface HIPAAEvidenceData {
  controls: HIPAAControl[];
}

// Helper: filter by safeguard type
export const getControlsBySafeguard = (type: SafeguardType): HIPAAControl[] =>
  hipaaEvidenceData.controls.filter(c => c.safeguardType === type);

// Helper: filter required only
export const getRequiredControls = (): HIPAAControl[] =>
  hipaaEvidenceData.controls.filter(c => c.reqType === 'Required');

// SRA Section → Evidence Control mapping
// When a section scores low risk, surface these control IDs for remediation
export const sraToEvidenceMap: Record<string, string[]> = {
  'section_1': ['HIPAA-ID-01', 'HIPAA-ID-02', 'HIPAA-ID-04', 'HIPAA-ID-05'],
  'section_2': ['HIPAA-GV-03', 'HIPAA-GV-04', 'HIPAA-GV-05', 'HIPAA-ID-03'],
  'section_3': ['HIPAA-PR-01', 'HIPAA-PR-02', 'HIPAA-PR-03', 'HIPAA-PR-04', 'HIPAA-PR-05'],
  'section_4': ['HIPAA-PR-06', 'HIPAA-PR-07', 'HIPAA-PR-08', 'HIPAA-PR-11'],
  'section_5': ['HIPAA-PR-09', 'HIPAA-PR-10', 'HIPAA-PR-12', 'HIPAA-PR-13', 'HIPAA-PR-14', 'HIPAA-PR-15'],
  'section_6': ['HIPAA-PR-16', 'HIPAA-PR-17', 'HIPAA-PR-18', 'HIPAA-PR-19', 'HIPAA-PR-20', 'HIPAA-PR-21', 'HIPAA-PR-22', 'HIPAA-DE-03'],
  'section_7': ['HIPAA-RS-01', 'HIPAA-RS-02', 'HIPAA-RC-01', 'HIPAA-RC-02', 'HIPAA-RC-03', 'HIPAA-RC-04', 'HIPAA-GV-02'],
};

export const hipaaEvidenceData: HIPAAEvidenceData = {
  "controls": [
    {
      "id": 1,
      "controlId": "HIPAA-ID-01",
      "controlName": "Risk Analysis",
      "hipaaCitation": "45 CFR §164.308(a)(1)(ii)(A)",
      "safeguardType": "Administrative",
      "reqType": "Required",
      "primaryArtifact": "Written Risk Analysis Report",
      "whatToCollect": "Annual document identifying threats, vulnerabilities, and risks to ePHI confidentiality, integrity, and availability across all systems (EHR, billing, email, devices).",
      "practicalSteps": "Use a free HHS SRA Tool (available at healthit.gov). Document each system (e.g., Dentrix, Eaglesoft), list threats (ransomware, lost laptop), rate likelihood and impact. Have the Security Officer sign off.",
      "evidenceFormat": "PDF report (HHS SRA Tool export or Word doc), signed by Security Officer",
      "frequency": "Annual",
      "applicable": "Yes"
    },
    {
      "id": 2,
      "controlId": "HIPAA-ID-02",
      "controlName": "Risk Management",
      "hipaaCitation": "45 CFR §164.308(a)(1)(ii)(B)",
      "safeguardType": "Administrative",
      "reqType": "Required",
      "primaryArtifact": "Risk Remediation / Management Plan",
      "whatToCollect": "Log showing how identified risks are being addressed, prioritized, and tracked to resolution.",
      "practicalSteps": "Create a simple spreadsheet listing each risk from the Risk Analysis, the planned action, the owner (e.g., Office Manager), and due date. Update quarterly.",
      "evidenceFormat": "Spreadsheet (Excel/Google Sheets) or written action plan, dated",
      "frequency": "Ongoing / Quarterly review",
      "applicable": "Yes"
    },
    {
      "id": 3,
      "controlId": "HIPAA-ID-03",
      "controlName": "Sanction Policy",
      "hipaaCitation": "45 CFR §164.308(a)(1)(ii)(C)",
      "safeguardType": "Administrative",
      "reqType": "Required",
      "primaryArtifact": "Signed Sanction Policy + Disciplinary Record Log",
      "whatToCollect": "Policy stating consequences for HIPAA violations. Records of any sanctions applied (even if none—document 'no violations this period').",
      "practicalSteps": "Include sanction escalation table in your Security Policy. Have all staff sign acknowledgment. Keep a log (can be an Excel sheet) noting any violations reviewed.",
      "evidenceFormat": "Policy document (signed by staff) + violation/sanction log (Excel)",
      "frequency": "Policy: annual re-sign; Log: ongoing",
      "applicable": "Yes"
    },
    {
      "id": 4,
      "controlId": "HIPAA-DE-01",
      "controlName": "Information System Activity Review",
      "hipaaCitation": "45 CFR §164.308(a)(1)(ii)(D)",
      "safeguardType": "Administrative",
      "reqType": "Required",
      "primaryArtifact": "System Audit Log Review Record",
      "whatToCollect": "Documented evidence that someone reviews EHR/system audit logs periodically to detect unusual activity.",
      "practicalSteps": "In your EHR (e.g., Dentrix, Eaglesoft, Curve), export or screenshot the audit/activity log monthly. Note who reviewed it and whether anything was flagged. Attach to a monthly review log.",
      "evidenceFormat": "Screenshots or exported audit log + signed monthly review checklist",
      "frequency": "Monthly",
      "applicable": "Yes"
    },
    {
      "id": 5,
      "controlId": "HIPAA-GV-01",
      "controlName": "Assigned Security Official",
      "hipaaCitation": "45 CFR §164.308(a)(2)",
      "safeguardType": "Administrative",
      "reqType": "Required",
      "primaryArtifact": "Security Officer Designation Letter",
      "whatToCollect": "Formal written document naming the individual responsible for HIPAA security (often the practice owner/physician or office manager in small practices).",
      "practicalSteps": "Draft a one-page letter on practice letterhead designating the Security Officer by name and title. Sign and date it. For small practices, this is often Dr. [Name] or the Office Manager.",
      "evidenceFormat": "Signed letter on practice letterhead (PDF or hard copy scan)",
      "frequency": "One-time (update if person changes)",
      "applicable": "Yes"
    },
    {
      "id": 6,
      "controlId": "HIPAA-PR-01",
      "controlName": "Workforce Access Authorization",
      "hipaaCitation": "45 CFR §164.308(a)(3)(ii)(A)",
      "safeguardType": "Administrative",
      "reqType": "Addressable",
      "primaryArtifact": "Access Authorization Form / Log",
      "whatToCollect": "Records showing that each staff member's access to ePHI systems was formally approved before being granted.",
      "practicalSteps": "Create a simple 'New Employee Access Request' form. When onboarding a new hire, complete the form (role, systems needed, approver) and file it. Your EHR's user setup screen can serve as supporting documentation.",
      "evidenceFormat": "Signed access request form per employee + EHR user creation screenshot",
      "frequency": "Per new hire",
      "applicable": "Yes"
    },
    {
      "id": 7,
      "controlId": "HIPAA-PR-02",
      "controlName": "Workforce Clearance Procedures",
      "hipaaCitation": "45 CFR §164.308(a)(3)(ii)(B)",
      "safeguardType": "Administrative",
      "reqType": "Addressable",
      "primaryArtifact": "Background Check Records or Screening Policy",
      "whatToCollect": "Documentation that the practice has evaluated whether staff should access ePHI before granting access.",
      "practicalSteps": "For small practices: keep background check receipts (e.g., from Sterling, Checkr) for clinical/admin staff. If not running formal checks, document your screening process (interviews, reference checks) in a written procedure.",
      "evidenceFormat": "Background check reports (PDFs) or written screening procedure",
      "frequency": "Per new hire",
      "applicable": "Yes"
    },
    {
      "id": 8,
      "controlId": "HIPAA-PR-03",
      "controlName": "Workforce Termination Procedures",
      "hipaaCitation": "45 CFR §164.308(a)(3)(ii)(C)",
      "safeguardType": "Administrative",
      "reqType": "Addressable",
      "primaryArtifact": "Termination Checklist with Access Revocation Confirmation",
      "whatToCollect": "Evidence that access was revoked promptly when a staff member left or was terminated.",
      "practicalSteps": "Create a checklist: (1) EHR account disabled — screenshot, (2) Email account removed, (3) Physical keys/badges returned, (4) Passwords changed. Complete within 24 hours of separation. Keep completed checklists on file.",
      "evidenceFormat": "Signed termination checklist + EHR screenshot showing account disabled",
      "frequency": "Per separation event",
      "applicable": "Yes"
    },
    {
      "id": 9,
      "controlId": "HIPAA-PR-04",
      "controlName": "Access Authorization Policy",
      "hipaaCitation": "45 CFR §164.308(a)(4)(ii)(B)",
      "safeguardType": "Administrative",
      "reqType": "Addressable",
      "primaryArtifact": "Written Access Authorization Policy",
      "whatToCollect": "A policy defining the rules for who can access ePHI, at what level, and how access decisions are made.",
      "practicalSteps": "Document a role-based access matrix for your practice: Dentist/Surgeon (full access), Hygienist (clinical records), Front Desk (scheduling/billing, no clinical notes), etc. Include in your Security Policy binder.",
      "evidenceFormat": "Policy document (1-2 pages) included in the Security Policy binder, signed",
      "frequency": "Annual review",
      "applicable": "Yes"
    },
    {
      "id": 10,
      "controlId": "HIPAA-PR-05",
      "controlName": "Access Establishment & Modification",
      "hipaaCitation": "45 CFR §164.308(a)(4)(ii)(C)",
      "safeguardType": "Administrative",
      "reqType": "Addressable",
      "primaryArtifact": "Periodic Access Review Log",
      "whatToCollect": "Documentation of periodic reviews confirming that active user accounts and access levels are still appropriate.",
      "practicalSteps": "Twice a year, pull the user list from your EHR and email system. For each account, confirm the person is still employed and their access level is still correct. Document decisions (retain/revoke/modify). Use the provided Access Review Template.",
      "evidenceFormat": "Completed Access Review Log (Excel template) — see attachment",
      "frequency": "Semi-annual",
      "applicable": "Yes"
    },
    {
      "id": 11,
      "controlId": "HIPAA-PR-06",
      "controlName": "Security Awareness Training",
      "hipaaCitation": "45 CFR §164.308(a)(5)(i)",
      "safeguardType": "Administrative",
      "reqType": "Required",
      "primaryArtifact": "Training Completion Records / Attestation Log",
      "whatToCollect": "Evidence that all staff completed HIPAA security awareness training and when.",
      "practicalSteps": "Use a HIPAA training platform (e.g., Compliancy Group, KnowBe4, Dental Compliance) or conduct in-house training. Collect signed attestation forms or export completion certificates. Retain for 6 years.",
      "evidenceFormat": "Signed training attestation forms or platform completion certificates (PDF) per employee",
      "frequency": "Annual (+ upon hire)",
      "applicable": "Yes"
    },
    {
      "id": 12,
      "controlId": "HIPAA-PR-07",
      "controlName": "Malware Protection",
      "hipaaCitation": "45 CFR §164.308(a)(5)(ii)(B)",
      "safeguardType": "Administrative",
      "reqType": "Addressable",
      "primaryArtifact": "Antivirus/Endpoint Protection Screenshots + Subscription Records",
      "whatToCollect": "Evidence that anti-malware software is installed, active, and up to date on all workstations.",
      "practicalSteps": "Screenshot the antivirus dashboard (e.g., Windows Defender, Malwarebytes, Sophos) on each computer showing: software name, version, last scan date, and status (active). Also keep the subscription renewal receipt.",
      "evidenceFormat": "Screenshots from each workstation + subscription invoice/renewal confirmation",
      "frequency": "Quarterly screenshots; annual subscription renewal",
      "applicable": "Yes"
    },
    {
      "id": 13,
      "controlId": "HIPAA-DE-02",
      "controlName": "Login Monitoring",
      "hipaaCitation": "45 CFR §164.308(a)(5)(ii)(C)",
      "safeguardType": "Administrative",
      "reqType": "Addressable",
      "primaryArtifact": "Failed Login / Suspicious Access Reports",
      "whatToCollect": "Evidence that the practice monitors for unauthorized login attempts to EHR and other clinical systems.",
      "practicalSteps": "In your EHR, run the 'failed login attempts' or 'login audit' report monthly. Screenshot or export and save. If your EHR doesn't support this, document the process of checking Windows Event Viewer logs on workstations.",
      "evidenceFormat": "Monthly EHR login audit report screenshots or exported logs",
      "frequency": "Monthly",
      "applicable": "Yes"
    },
    {
      "id": 14,
      "controlId": "HIPAA-PR-08",
      "controlName": "Password Management",
      "hipaaCitation": "45 CFR §164.308(a)(5)(ii)(D)",
      "safeguardType": "Administrative",
      "reqType": "Addressable",
      "primaryArtifact": "Password Policy + Password Manager Setup Screenshot",
      "whatToCollect": "Documentation that the practice enforces strong password creation and management practices.",
      "practicalSteps": "Use a password manager (e.g., 1Password, Bitwarden, LastPass for Business). Screenshot the admin console showing accounts enrolled. Document the password policy (minimum length, complexity, no sharing) in writing and have staff sign it.",
      "evidenceFormat": "Signed password policy + password manager admin console screenshot showing all staff enrolled",
      "frequency": "Annual policy re-sign; ongoing manager use",
      "applicable": "Yes"
    },
    {
      "id": 15,
      "controlId": "HIPAA-RS-01",
      "controlName": "Incident Response Plan",
      "hipaaCitation": "45 CFR §164.308(a)(6)(i)",
      "safeguardType": "Administrative",
      "reqType": "Required",
      "primaryArtifact": "Written Incident Response Plan",
      "whatToCollect": "A documented plan describing how the practice will detect, report, and respond to security incidents involving ePHI.",
      "practicalSteps": "Draft a 2–3 page incident response plan tailored to your practice. Include: what counts as an incident, who to call (Security Officer, legal counsel, HHS if needed), notification timelines, and how to preserve evidence. Review annually.",
      "evidenceFormat": "Signed Incident Response Plan (PDF or Word), dated",
      "frequency": "Annual review",
      "applicable": "Yes"
    },
    {
      "id": 16,
      "controlId": "HIPAA-RS-02",
      "controlName": "Incident Reporting & Documentation",
      "hipaaCitation": "45 CFR §164.308(a)(6)(ii)",
      "safeguardType": "Administrative",
      "reqType": "Required",
      "primaryArtifact": "Incident / Breach Log",
      "whatToCollect": "A running log of all security incidents investigated, including outcome (breach or not, notifications sent). If no incidents, document 'no incidents this period'.",
      "practicalSteps": "Maintain an Incident Log spreadsheet. After any suspected breach or incident, document: date discovered, description, investigation steps, outcome, and whether HHS/patient notification was required. Review log annually.",
      "evidenceFormat": "Incident Log spreadsheet (Excel), updated per event; 'No Incidents' attestation if none occurred",
      "frequency": "Ongoing; annual review",
      "applicable": "Yes"
    },
    {
      "id": 17,
      "controlId": "HIPAA-RC-01",
      "controlName": "Data Backup Plan",
      "hipaaCitation": "45 CFR §164.308(a)(7)(ii)(A)",
      "safeguardType": "Administrative",
      "reqType": "Required",
      "primaryArtifact": "Backup Configuration Screenshot + Backup Test Log",
      "whatToCollect": "Evidence that ePHI data (EHR database, patient files) is backed up regularly and backups are tested for recoverability.",
      "practicalSteps": "Screenshot your backup solution settings (e.g., Veeam, Carbonite, your EHR's cloud backup) showing frequency and destination. Quarterly: run a test restore of a sample file and document the result (who tested, what was restored, success/fail).",
      "evidenceFormat": "Backup software configuration screenshot + quarterly backup test log (Excel or Word)",
      "frequency": "Backup: daily (automated); Test log: quarterly",
      "applicable": "Yes"
    },
    {
      "id": 18,
      "controlId": "HIPAA-RC-02",
      "controlName": "Disaster Recovery Plan",
      "hipaaCitation": "45 CFR §164.308(a)(7)(ii)(B)",
      "safeguardType": "Administrative",
      "reqType": "Required",
      "primaryArtifact": "Written Disaster Recovery Plan",
      "whatToCollect": "A plan for restoring EHR, billing, and scheduling systems after a disruptive event (ransomware, fire, hardware failure).",
      "practicalSteps": "For small practices, this can be a 2–3 page document covering: key contacts (EHR vendor support line, IT contractor), how to restore from backup, estimated RTO (e.g., 48 hours), and temporary paper-based workflow. Review annually.",
      "evidenceFormat": "Signed Disaster Recovery Plan (Word/PDF)",
      "frequency": "Annual review",
      "applicable": "Yes"
    },
    {
      "id": 19,
      "controlId": "HIPAA-RC-03",
      "controlName": "Emergency Mode Operations",
      "hipaaCitation": "45 CFR §164.308(a)(7)(ii)(C)",
      "safeguardType": "Administrative",
      "reqType": "Required",
      "primaryArtifact": "Emergency Operations Procedure Document",
      "whatToCollect": "A documented procedure for maintaining critical care operations (patient access, treatment, billing) when primary systems are unavailable.",
      "practicalSteps": "Document how staff will access essential patient info if EHR is down (e.g., printed schedule, paper charts, break-glass EHR credentials). Include who is authorized and under what conditions. Can be a 1-page addendum to the DR plan.",
      "evidenceFormat": "Emergency Operations Procedure (1–2 pages, part of DR Plan)",
      "frequency": "Annual review",
      "applicable": "Yes"
    },
    {
      "id": 20,
      "controlId": "HIPAA-RC-04",
      "controlName": "Contingency Plan Testing",
      "hipaaCitation": "45 CFR §164.308(a)(7)(ii)(D)",
      "safeguardType": "Administrative",
      "reqType": "Addressable",
      "primaryArtifact": "Annual Contingency Plan Test Record",
      "whatToCollect": "Evidence that the backup/DR/emergency operations plans are periodically tested to confirm they work.",
      "practicalSteps": "Once a year, conduct a tabletop exercise or actual drill. Walk through the DR plan with key staff, test the backup restore, and document what worked and what needs improvement. Sign off on a test summary form.",
      "evidenceFormat": "Signed Contingency Plan Test Summary (Word/PDF) with date, participants, and findings",
      "frequency": "Annual",
      "applicable": "Yes"
    },
    {
      "id": 21,
      "controlId": "HIPAA-ID-04",
      "controlName": "Periodic Security Evaluation",
      "hipaaCitation": "45 CFR §164.308(a)(8)",
      "safeguardType": "Administrative",
      "reqType": "Required",
      "primaryArtifact": "Annual Security Evaluation Report",
      "whatToCollect": "Documentation that the practice periodically evaluates whether its security controls are effective and still appropriate.",
      "practicalSteps": "Conduct an annual review of all HIPAA controls (can be done alongside risk analysis renewal). Summarize findings, any gaps identified, and remediation steps. The Security Officer should sign the report.",
      "evidenceFormat": "Annual Security Evaluation Report (Word/PDF), signed by Security Officer",
      "frequency": "Annual",
      "applicable": "Yes"
    },
    {
      "id": 22,
      "controlId": "HIPAA-GV-02",
      "controlName": "Business Associate Agreements",
      "hipaaCitation": "45 CFR §164.308(b)(1), §164.314(a)",
      "safeguardType": "Administrative",
      "reqType": "Required",
      "primaryArtifact": "Signed BAAs with All Applicable Vendors",
      "whatToCollect": "Signed BAA documents from every vendor that creates, receives, maintains, or transmits ePHI on behalf of the practice (EHR vendor, billing service, IT support, transcription, cloud storage, etc.).",
      "practicalSteps": "Maintain a Vendor BAA Tracker spreadsheet listing each vendor, BAA execution date, expiration, and file location. Ensure you have a signed BAA from: EHR vendor, dental imaging software, billing service, IT managed service provider, cloud storage, and any transcription service.",
      "evidenceFormat": "Signed BAA PDFs (one per vendor) + Vendor BAA Tracker spreadsheet",
      "frequency": "One-time per vendor; review on contract renewal",
      "applicable": "Yes"
    },
    {
      "id": 23,
      "controlId": "HIPAA-PR-09",
      "controlName": "Facility Access Controls",
      "hipaaCitation": "45 CFR §164.310(a)(1)",
      "safeguardType": "Physical",
      "reqType": "Required",
      "primaryArtifact": "Facility Access Log / Key Control Record + Physical Security Documentation",
      "whatToCollect": "Evidence that physical access to areas where ePHI systems are located is controlled and monitored.",
      "practicalSteps": "Document who has keys/access codes to the office and server room (if any). Use an alarm system with individual codes per staff member. Keep the alarm access log (typically available from your alarm provider). Photograph door locks and server closet.",
      "evidenceFormat": "Key/code assignment log (Excel) + alarm access report (from alarm vendor) + photos of secure areas",
      "frequency": "Annual key/code audit; ongoing alarm logs",
      "applicable": "Yes"
    },
    {
      "id": 24,
      "controlId": "HIPAA-PR-10",
      "controlName": "Facility Security Plan",
      "hipaaCitation": "45 CFR §164.310(a)(2)(ii)",
      "safeguardType": "Physical",
      "reqType": "Addressable",
      "primaryArtifact": "Written Facility Security Plan",
      "whatToCollect": "A documented plan describing how the physical facility is secured to protect equipment containing ePHI.",
      "practicalSteps": "Write a 1–2 page Facility Security Plan describing: locked entry points, server/workstation placement, alarm system, visitor procedures, and camera coverage (if any). Can be combined with other physical security documentation.",
      "evidenceFormat": "Facility Security Plan (Word/PDF)",
      "frequency": "Annual review",
      "applicable": "Yes"
    },
    {
      "id": 25,
      "controlId": "HIPAA-PR-11",
      "controlName": "Visitor Access Management",
      "hipaaCitation": "45 CFR §164.310(a)(2)(iii)",
      "safeguardType": "Physical",
      "reqType": "Addressable",
      "primaryArtifact": "Visitor Log",
      "whatToCollect": "A log of non-staff individuals who access areas containing ePHI systems (back office, server room, IT areas).",
      "practicalSteps": "Keep a paper or digital visitor log at the front desk for any vendor, IT technician, or non-patient visitor accessing back-office areas. Record: name, company, date/time, purpose, escorted by whom.",
      "evidenceFormat": "Visitor Log (paper sign-in sheet or Excel), dated entries",
      "frequency": "Ongoing (per visit)",
      "applicable": "Yes"
    },
    {
      "id": 26,
      "controlId": "HIPAA-PR-12",
      "controlName": "Workstation Use Policy",
      "hipaaCitation": "45 CFR §164.310(b)",
      "safeguardType": "Physical",
      "reqType": "Required",
      "primaryArtifact": "Signed Workstation Use Policy",
      "whatToCollect": "A policy defining appropriate use of workstations that access ePHI (no personal use, no social media, screen privacy, etc.).",
      "practicalSteps": "Include a Workstation Use Policy in your Security Policy binder. Have all staff sign annually. Cover: acceptable use only for practice business, no sharing of login credentials, screen lock when stepping away, no ePHI on personal devices.",
      "evidenceFormat": "Signed Workstation Use Policy (one per employee, filed in HR folder)",
      "frequency": "Annual re-sign",
      "applicable": "Yes"
    },
    {
      "id": 27,
      "controlId": "HIPAA-PR-13",
      "controlName": "Workstation Security",
      "hipaaCitation": "45 CFR §164.310(c)",
      "safeguardType": "Physical",
      "reqType": "Required",
      "primaryArtifact": "Workstation Physical Security Documentation",
      "whatToCollect": "Evidence that workstations are physically secured to prevent unauthorized access (e.g., screen positioning, cable locks, clean-desk practices).",
      "practicalSteps": "Photograph each workstation to document: monitor position (not visible to patients/waiting room), cable lock or desk mounting, and location (inside secure area). Note any portable devices and their storage location.",
      "evidenceFormat": "Photos of each workstation with annotations (can be in Word doc) + list of all workstations",
      "frequency": "Annual photo review",
      "applicable": "Yes"
    },
    {
      "id": 28,
      "controlId": "HIPAA-PR-14",
      "controlName": "Media Disposal",
      "hipaaCitation": "45 CFR §164.310(d)(2)(i)",
      "safeguardType": "Physical",
      "reqType": "Required",
      "primaryArtifact": "Media Disposal Log / Certificate of Destruction",
      "whatToCollect": "Evidence that hard drives, USB drives, CDs, and paper records containing ePHI are securely destroyed before disposal.",
      "practicalSteps": "When disposing of old computers or drives, use a certified destruction vendor (e.g., Iron Mountain, Shred-it for paper, or a local IT vendor who provides certificates). Keep the certificate. For in-house destruction, log the date, device description, method, and staff who performed it.",
      "evidenceFormat": "Certificate of Destruction (from vendor) OR internal destruction log (Excel/Word)",
      "frequency": "Per disposal event",
      "applicable": "Yes"
    },
    {
      "id": 29,
      "controlId": "HIPAA-PR-15",
      "controlName": "Media Reuse / Sanitization",
      "hipaaCitation": "45 CFR §164.310(d)(2)(ii)",
      "safeguardType": "Physical",
      "reqType": "Required",
      "primaryArtifact": "Media Sanitization Log",
      "whatToCollect": "Evidence that storage media is securely wiped before being reused (e.g., wiping a hard drive before giving a computer to a new employee).",
      "practicalSteps": "Document any time a drive or device is wiped and reused. Log: device description, method used (e.g., DBAN, Windows format with BitLocker wipe), date, and who performed it. For small practices, this is typically handled by your IT vendor — get documentation from them.",
      "evidenceFormat": "Sanitization log (Excel) or IT vendor written confirmation",
      "frequency": "Per reuse event",
      "applicable": "Yes"
    },
    {
      "id": 30,
      "controlId": "HIPAA-ID-05",
      "controlName": "Device Accountability",
      "hipaaCitation": "45 CFR §164.310(d)(2)(iii)",
      "safeguardType": "Physical",
      "reqType": "Addressable",
      "primaryArtifact": "Device / Asset Inventory List",
      "whatToCollect": "A current inventory of all hardware that stores or accesses ePHI, including laptops, tablets, workstations, and portable storage.",
      "practicalSteps": "Maintain a simple spreadsheet listing: device type, make/model, serial number, assigned user, location, encryption status (yes/no), and last audit date. Update whenever a device is added, removed, or reassigned.",
      "evidenceFormat": "Device Inventory spreadsheet (Excel), current and signed off by Security Officer",
      "frequency": "Semi-annual audit; ongoing updates",
      "applicable": "Yes"
    },
    {
      "id": 31,
      "controlId": "HIPAA-PR-16",
      "controlName": "Unique User Identification",
      "hipaaCitation": "45 CFR §164.312(a)(2)(i)",
      "safeguardType": "Technical",
      "reqType": "Required",
      "primaryArtifact": "EHR User List Screenshot",
      "whatToCollect": "Evidence that every person accessing the EHR has a unique, individual username — no shared logins.",
      "practicalSteps": "Export or screenshot the user management section of your EHR showing all active user accounts with individual usernames. Verify no shared or generic accounts exist (e.g., no 'frontdesk' shared login).",
      "evidenceFormat": "EHR user list screenshot (annotated to confirm unique accounts) + date of review",
      "frequency": "Semi-annual",
      "applicable": "Yes"
    },
    {
      "id": 32,
      "controlId": "HIPAA-PR-17",
      "controlName": "Emergency Access Procedure",
      "hipaaCitation": "45 CFR §164.312(a)(2)(ii)",
      "safeguardType": "Technical",
      "reqType": "Required",
      "primaryArtifact": "Emergency Access Procedure Document + Break-Glass Access Log",
      "whatToCollect": "A documented procedure for how authorized staff can access ePHI in an emergency when normal access is unavailable (e.g., if the primary physician is incapacitated).",
      "practicalSteps": "Write a 1-page procedure: who can invoke emergency access, how (e.g., contact EHR vendor for emergency credentials, or use a sealed envelope with break-glass credentials), and how each use is logged and reviewed afterward.",
      "evidenceFormat": "Emergency Access Procedure (Word/PDF) + Break-Glass Log (Excel) noting any uses",
      "frequency": "Procedure: annual review; Log: per use",
      "applicable": "Yes"
    },
    {
      "id": 33,
      "controlId": "HIPAA-PR-18",
      "controlName": "Automatic Logoff",
      "hipaaCitation": "45 CFR §164.312(a)(2)(iii)",
      "safeguardType": "Technical",
      "reqType": "Addressable",
      "primaryArtifact": "EHR / Workstation Auto-Lock Settings Screenshot",
      "whatToCollect": "Evidence that workstations and EHR sessions automatically lock after a period of inactivity.",
      "practicalSteps": "Screenshot Windows screen saver/lock settings on each workstation showing timeout ≤ 15 minutes. Also screenshot the EHR's session timeout setting (if configurable). Most EHR vendors pre-configure this — confirm it's active.",
      "evidenceFormat": "Screenshots of Windows lock settings + EHR session timeout setting per workstation",
      "frequency": "Annual review",
      "applicable": "Yes"
    },
    {
      "id": 34,
      "controlId": "HIPAA-PR-19",
      "controlName": "Encryption of ePHI at Rest",
      "hipaaCitation": "45 CFR §164.312(a)(2)(iv)",
      "safeguardType": "Technical",
      "reqType": "Addressable",
      "primaryArtifact": "Encryption Configuration Screenshot / Vendor Attestation",
      "whatToCollect": "Evidence that ePHI stored on workstations, servers, and portable devices is encrypted.",
      "practicalSteps": "For Windows: screenshot BitLocker status (Control Panel > BitLocker). For Macs: screenshot FileVault status. For cloud EHR: obtain the vendor's security/encryption attestation or SOC 2 report from their trust portal. For portable devices: document encryption enablement.",
      "evidenceFormat": "BitLocker/FileVault screenshots per device + EHR vendor encryption documentation (PDF)",
      "frequency": "Annual confirmation; vendor docs on renewal",
      "applicable": "Yes"
    },
    {
      "id": 35,
      "controlId": "HIPAA-DE-03",
      "controlName": "Audit Logging",
      "hipaaCitation": "45 CFR §164.312(b)",
      "safeguardType": "Technical",
      "reqType": "Required",
      "primaryArtifact": "EHR Audit Log — Enabled Confirmation + Sample Export",
      "whatToCollect": "Evidence that your EHR and other systems automatically log all access and activity involving ePHI.",
      "practicalSteps": "In your EHR, confirm audit logging is enabled (screenshot of the setting). Export a sample audit log (30-day period) to show the format and that records are being captured. Retain log exports per your retention schedule.",
      "evidenceFormat": "EHR audit logging settings screenshot + sample audit log export (PDF/CSV)",
      "frequency": "Confirmation: annual; Sample export: quarterly",
      "applicable": "Yes"
    },
    {
      "id": 36,
      "controlId": "HIPAA-PR-20",
      "controlName": "Integrity Controls",
      "hipaaCitation": "45 CFR §164.312(c)(1)",
      "safeguardType": "Technical",
      "reqType": "Required",
      "primaryArtifact": "EHR Vendor Integrity Documentation / Data Validation Confirmation",
      "whatToCollect": "Evidence that the practice has controls in place to ensure ePHI is not improperly altered or destroyed.",
      "practicalSteps": "For most small practices, this is handled by the EHR vendor. Obtain vendor documentation (from their security FAQ, BAA, or SOC 2 report) describing their data integrity controls (checksums, audit trails, backup verification). Also document your own backup restore testing as supporting evidence.",
      "evidenceFormat": "EHR vendor integrity controls documentation (PDF from vendor portal) + backup test log",
      "frequency": "Annual (tied to vendor contract renewal)",
      "applicable": "Yes"
    },
    {
      "id": 37,
      "controlId": "HIPAA-PR-21",
      "controlName": "User Authentication",
      "hipaaCitation": "45 CFR §164.312(d)",
      "safeguardType": "Technical",
      "reqType": "Required",
      "primaryArtifact": "Authentication Configuration Screenshots (MFA, Password Requirements)",
      "whatToCollect": "Evidence that users must authenticate before accessing ePHI systems, and that authentication is appropriately strong.",
      "practicalSteps": "Screenshot EHR login screen (showing username + password required). If MFA is available and enabled in your EHR, screenshot the MFA setup. Also screenshot email/Microsoft 365 MFA settings if practice email contains ePHI.",
      "evidenceFormat": "EHR login/MFA configuration screenshots + email MFA screenshot",
      "frequency": "Annual review",
      "applicable": "Yes"
    },
    {
      "id": 38,
      "controlId": "HIPAA-PR-22",
      "controlName": "Encryption in Transit",
      "hipaaCitation": "45 CFR §164.312(e)(2)(ii)",
      "safeguardType": "Technical",
      "reqType": "Addressable",
      "primaryArtifact": "Encrypted Transmission Documentation",
      "whatToCollect": "Evidence that ePHI transmitted electronically (email, patient portal, imaging file transfers) is encrypted.",
      "practicalSteps": "For cloud EHR: obtain vendor's TLS/encryption-in-transit documentation. For email: if using encrypted email service (e.g., Paubox, Virtru, Hushmail), screenshot the setup. If using a patient portal, confirm it uses HTTPS. Document how you send lab results or referral info securely.",
      "evidenceFormat": "EHR vendor TLS documentation + secure email service configuration screenshot (or BAA confirming encrypted email)",
      "frequency": "Annual confirmation",
      "applicable": "Yes"
    },
    {
      "id": 39,
      "controlId": "HIPAA-GV-03",
      "controlName": "Security Policies & Procedures",
      "hipaaCitation": "45 CFR §164.316(a)",
      "safeguardType": "Administrative",
      "reqType": "Required",
      "primaryArtifact": "Complete HIPAA Security Policy Binder",
      "whatToCollect": "A set of written, approved, and implemented security policies and procedures covering all HIPAA Security Rule requirements.",
      "practicalSteps": "Compile a Security Policy binder (digital or physical) including: Information Security Policy, Access Control Policy, Incident Response Plan, Workstation Use Policy, Sanction Policy, and Backup/DR Policy. Have the practice owner/Security Officer sign and date each policy. Keep a master log of all policies.",
      "evidenceFormat": "Security Policy binder (PDF compilation or folder) — each policy signed and dated; Policy index list",
      "frequency": "Annual review and re-approval",
      "applicable": "Yes"
    },
    {
      "id": 40,
      "controlId": "HIPAA-GV-04",
      "controlName": "Documentation Retention",
      "hipaaCitation": "45 CFR §164.316(b)(2)(i)",
      "safeguardType": "Administrative",
      "reqType": "Required",
      "primaryArtifact": "Document Retention Schedule + Evidence Archive",
      "whatToCollect": "Evidence that HIPAA security documentation is retained for a minimum of 6 years from creation date or last effective date.",
      "practicalSteps": "Create a Retention Schedule document specifying retention period for each document type. Maintain a secure archive (physical filing cabinet and/or encrypted cloud folder) with dated documents. Annually verify older documents are still present and accessible.",
      "evidenceFormat": "Retention Schedule policy (Word/PDF) + folder/archive structure showing dated documents",
      "frequency": "Annual verification",
      "applicable": "Yes"
    },
    {
      "id": 41,
      "controlId": "HIPAA-GV-05",
      "controlName": "Documentation Review & Update",
      "hipaaCitation": "45 CFR §164.316(b)(2)(iii)",
      "safeguardType": "Administrative",
      "reqType": "Required",
      "primaryArtifact": "Annual Documentation Review Log",
      "whatToCollect": "Evidence that security policies and procedures are reviewed and updated periodically and when significant environmental or operational changes occur.",
      "practicalSteps": "Each year (or whenever there is a major change — new EHR, new staff, security incident, regulatory update), review each policy, note what changed, and re-sign/re-date it. Maintain a review log tracking: document name, review date, reviewer, changes made (or 'No changes — confirmed current').",
      "evidenceFormat": "Annual Policy Review Log (Excel or Word table) signed by Security Officer",
      "frequency": "Annual",
      "applicable": "Yes"
    }
  ]
};
