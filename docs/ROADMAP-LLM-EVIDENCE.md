# Roadmap: LLM-Based Evidence & Report Enhancement

**Status:** Planned (next level)  
**Current behavior:** Documents are uploaded per control; no content analysis. Reports are generated from assessment answers and gaps; no LLM validation.

---

## Next level: LLM validation and smarter reporting

1. **Uploaded documents**
   - LLM checks/validates uploaded evidence (e.g. classify: equipment inventory, policy, procedure, training record).
   - Match document content to control expectations; flag mismatches or weak evidence.

2. **Generated reports**
   - LLM classifies and structures already generated reports.
   - Cross-check report narratives and gap/risk text against evidence and answers.

3. **Matching and consistency**
   - Correlate: evidence ↔ control requirements ↔ report findings.
   - Identify missing evidence, inconsistent answers, or unclear narratives.

4. **Client feedback loop**
   - Send clarifications or correction requests to the client (e.g. “Please provide equipment inventory for control X”, “Evidence for Y does not match policy type”).
   - Optional: in-app tasks or notifications with due dates.

5. **Output**
   - After validation and (optional) client updates: produce a more accurate, consistent, and readable final report.

---

## Dependencies

- LLM already configured (`ANTHROPIC_API_KEY`, `LLM_ENABLED` in config).
- Document text extraction (PDF/DOCX) for LLM input.
- Optional: workflow state for “pending client response” and “report revision” cycles.

---

*Document type and report content are today determined only by user choice and engine rules; this roadmap describes the intended evolution when LLM checks and client feedback are added.*
