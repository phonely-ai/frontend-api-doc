# Remaining Issues Found in Staging Branch

After reviewing the staging branch, here are all the spelling, grammar, and formatting issues that still need to be fixed:

---

## 1. docs.json

### Issue 1: Typo in navigation - "Agent Guildelines"
**Line:** 103
**Current:**
```json
"group": "Agent Guildelines",
```
**Should be:**
```json
"group": "Agent Guidelines",
```
**Issue:** Misspelling of "Guidelines"

---

### Issue 2: Extra space before "AGENT KNOWLEDGEBASE"
**Line:** 145
**Current:**
```json
"group": " AGENT KNOWLEDGEBASE",
```
**Should be:**
```json
"group": "AGENT KNOWLEDGEBASE",
```
**Issue:** Leading space before "AGENT"

---

## 2. key-concepts/flows.mdx

### Issue 1: Escape characters in markdown
**Line:** 42
**Current:**
```markdown
1. Click the **\\+** to create a new workflow or select an existing workflow and click the Edit button.
```
**Should be:**
```markdown
1. Click the **+** to create a new workflow or select an existing workflow and click the Edit button.
```
**Issue:** Unnecessary escape characters before plus sign

---

### Issue 2: Escape characters in markdown
**Line:** 44
**Current:**
```markdown
2. Click the "**\\+**" button between existing blocks or at the end of a chain to insert a new block.
```
**Should be:**
```markdown
2. Click the "**+**" button between existing blocks or at the end of a chain to insert a new block.
```
**Issue:** Unnecessary escape characters before plus sign

---

## 3. key-concepts/variables.mdx

### Issue: Missing capital letter
**Line:** 36
**Current:**
```markdown
**ive vs. post-call actions**
```
**Should be:**
```markdown
**Live vs. post-call actions**
```
**Issue:** Missing capital "L" in "Live"

---

## 4. outboundcalling/createaoutboundcallingcampaign.mdx

### Issue 1: Excessive bold formatting in headers (Multiple instances)
**Lines:** 31, 38, 52, 86, 98, 108, 122, 134

**Current:**
```markdown
### **Campaign Name**
### **Campaign Use Cases**
### **Connecting Twilio**
**Calls per Hour**
**Campaign Type: Continuous vs Batch**
### **Trigger Sources**
### **Selecting or Editing a Flow**
### **Mapping Variables**
```

**Should be:**
```markdown
### Campaign Name
### Campaign Use Cases
### Connecting Twilio
### Calls per Hour
### Campaign Type: Continuous vs Batch
### Trigger Sources
### Selecting or Editing a Flow
### Mapping Variables
```
**Issue:** Unnecessary bold formatting on headers (not consistent with documentation style)

---

### Issue 2: Inappropriate callout type
**Line:** 60
**Current:**
```markdown
<Danger>
  Your Twilio account must be set up on Autopay with a card that has sufficient funds, for your agent to successfully run an outbound campaign.
</Danger>
```
**Should be:**
```markdown
<Warning>
  Your Twilio account must be set up on Autopay with a card that has sufficient funds, for your agent to successfully run an outbound campaign.
</Warning>
```
**Issue:** Using `<Danger>` for a warning/requirement (should be `<Warning>`)

---

## 5. agent-design/voice/voice-and-personality.mdx

### Issue: Escape characters in markdown
**Line:** 71
**Current:**
```markdown
Headers define metadata or authentication details for your API call. Click **\\+ Add** to add key-value pairs such as:
```
**Should be:**
```markdown
Headers define metadata or authentication details for your API call. Click **+ Add** to add key-value pairs such as:
```
**Issue:** Unnecessary escape character before plus sign

---

## 6. blocks/live-call-actions/api-request.mdx

### Issue 1: Escape characters in markdown
**Line:** 71
**Current:**
```markdown
Headers define metadata or authentication details for your API call.                                                         Click **\\+ Add** to add key-value pairs such as:
```
**Should be:**
```markdown
Headers define metadata or authentication details for your API call. Click **+ Add** to add key-value pairs such as:
```
**Issue:** Excessive trailing spaces (57 spaces) and unnecessary escape character

---

### Issue 2: Missing space after period
**Line:** 90
**Current:**
```markdown
Define what data will be sent.Switch between **Code** (for JSON) and **Raw** (for plain text).
```
**Should be:**
```markdown
Define what data will be sent. Switch between **Code** (for JSON) and **Raw** (for plain text).
```
**Issue:** Missing space after period

---

### Issue 3: Spelling/Capitalization Error
**Line:** 135
**Current:**
```markdown
## Use cases for API Requests
```
**Already correct** - This appears to have been fixed already

---

## 7. testing/ab-testing.mdx

### Issue 1: Grammar - "behavioural" vs "behavioral"
**Line:** 67
**Current:**
```markdown
Evaluates success based on how the call ended. Use this if you care about the technical or behavioural outcome of the call.
```
**Should be:**
```markdown
Evaluates success based on how the call ended. Use this if you care about the technical or behavioral outcome of the call.
```
**Issue:** Inconsistent spelling - should use American English "behavioral" not British "behavioural"

---

### Issue 2: Missing closing quotation mark
**Line:** 82
**Current:**
```markdown
Example Use case: "We want more calls to end in transfers to the sales team.
```
**Should be:**
```markdown
Example Use case: "We want more calls to end in transfers to the sales team."
```
**Issue:** Missing closing quotation mark

---

## Summary Statistics

**Total Files with Issues:** 7
**Total Issues Found:** 17

### Issue Breakdown:
- **Spelling/Capitalization Errors:** 2
- **Grammar Errors:** 2
- **Formatting Issues (escape characters, spaces):** 4
- **Unprofessional Elements (excessive bold):** 8
- **Inappropriate callout types:** 1

### Most Common Issues:
1. Excessive bold formatting in headers (8 instances in outboundcalling file)
2. Escape characters in markdown (4 instances)
3. Navigation typos (2 instances in docs.json)

### Priority Levels:

**High Priority (User-Facing Errors):**
- Navigation typos in docs.json ("Agent Guildelines")
- Missing capital letter in "Live vs. post-call actions"
- Missing closing quotation mark
- Inappropriate callout type (Danger → Warning)

**Medium Priority (Formatting):**
- Excessive bold formatting in headers
- Escape characters in markdown
- Extra spaces

**Low Priority (Cosmetic):**
- British vs American spelling consistency

---

## Recommended Action Plan

1. **Fix navigation typos in docs.json** - Most visible to users
2. **Remove excessive bold formatting** - Consistency issue
3. **Clean up escape characters** - Code quality
4. **Fix grammar issues** - Professionalism
5. **Update callout types** - Prevents user confusion

---

*Document generated: 2026-01-06*
*Branch: staging*
*Repository: phonely-ai/frontend-api-doc*
