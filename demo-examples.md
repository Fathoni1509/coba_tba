# Demo Examples for DFA & NFA Analyzer

## 🎯 Quick Demo Examples

### Example 1: Binary String DFA (Accepts strings ending with "01")

**DFA Configuration:**
- **States**: `q0,q1,q2`
- **Alphabet**: `0,1`
- **Initial State**: `q0`
- **Final States**: `q2`

**Transitions:**
| State | Input 0 | Input 1 |
|-------|---------|---------|
| q0    | q1      | q0      |
| q1    | q1      | q2      |
| q2    | q1      | q0      |

**Test Strings:**
- ✅ `01` → Accepted
- ✅ `001` → Accepted  
- ✅ `1101` → Accepted
- ❌ `10` → Rejected
- ❌ `00` → Rejected
- ❌ `11` → Rejected

---

### Example 2: Even Number of 0's DFA

**DFA Configuration:**
- **States**: `even,odd`
- **Alphabet**: `0,1`
- **Initial State**: `even`
- **Final States**: `even`

**Transitions:**
| State | Input 0 | Input 1 |
|-------|---------|---------|
| even  | odd     | even    |
| odd   | even    | odd     |

**Test Strings:**
- ✅ `""` (empty) → Accepted
- ✅ `00` → Accepted
- ✅ `1100` → Accepted
- ✅ `1010` → Accepted
- ❌ `0` → Rejected
- ❌ `000` → Rejected

---

### Example 3: Regex to NFA Examples

**Regular Expression 1:** `(a|b)*abb`
- **Description**: Strings ending with "abb"
- **Test Strings:**
  - ✅ `abb` → Accepted
  - ✅ `aabb` → Accepted
  - ✅ `baabb` → Accepted
  - ❌ `ab` → Rejected
  - ❌ `abba` → Rejected

**Regular Expression 2:** `a*b*`
- **Description**: Zero or more a's followed by zero or more b's
- **Test Strings:**
  - ✅ `""` (empty) → Accepted
  - ✅ `aaa` → Accepted
  - ✅ `bbb` → Accepted
  - ✅ `aaabbb` → Accepted
  - ❌ `abab` → Rejected
  - ❌ `ba` → Rejected

**Regular Expression 3:** `(ab)*`
- **Description**: Zero or more repetitions of "ab"
- **Test Strings:**
  - ✅ `""` (empty) → Accepted
  - ✅ `ab` → Accepted
  - ✅ `abab` → Accepted
  - ✅ `ababab` → Accepted
  - ❌ `a` → Rejected
  - ❌ `aba` → Rejected

---

### Example 4: DFA Minimization Demo

**Original DFA** (Before Minimization):
- **States**: `A,B,C,D,E`
- **Alphabet**: `0,1`
- **Initial State**: `A`
- **Final States**: `D,E`

**Transitions:**
| State | Input 0 | Input 1 |
|-------|---------|---------|
| A     | B       | C       |
| B     | D       | E       |
| C     | E       | D       |
| D     | D       | D       |
| E     | E       | E       |

**Expected Result**: D and E are equivalent (both are final states with self-loops)

---

### Example 5: DFA Equivalence Demo

**DFA 1:**
- **States**: `q0,q1,q2`
- **Alphabet**: `0,1`
- **Initial State**: `q0`
- **Final States**: `q2`

**DFA 1 Transitions:**
| State | Input 0 | Input 1 |
|-------|---------|---------|
| q0    | q1      | q0      |
| q1    | q2      | q0      |
| q2    | q1      | q0      |

**DFA 2:**
- **States**: `p0,p1`
- **Alphabet**: `0,1`
- **Initial State**: `p0`
- **Final States**: `p1`

**DFA 2 Transitions:**
| State | Input 0 | Input 1 |
|-------|---------|---------|
| p0    | p1      | p0      |
| p1    | p0      | p0      |

**Expected Result**: NOT EQUIVALENT
- DFA 1 accepts strings with even number of 0's
- DFA 2 accepts strings with odd number of 0's

---

## 🎮 Interactive Demo Steps

### Step 1: DFA Simulator
1. Open the application in your browser
2. Copy the "Binary String DFA" example above
3. Fill in the states, alphabet, and transitions
4. Click "Build DFA" to see the visualization
5. Test the provided strings to see acceptance/rejection

### Step 2: Regex to NFA
1. Switch to "Regex to NFA" tab
2. Enter `(a|b)*abb` in the regex input
3. Click "Convert to NFA" to generate the NFA
4. Test strings like `abb`, `aabb`, `ab` to see results

### Step 3: DFA Minimization
1. Switch to "DFA Minimization" tab
2. Enter the minimization demo example
3. Click "Minimize DFA" to see before/after comparison
4. Check the statistics panel for reduction information

### Step 4: DFA Equivalence
1. Switch to "DFA Equivalence" tab
2. Enter both DFAs from the equivalence demo
3. Click "Check Equivalence" to see the comparison
4. Observe the visual result indicator

---

## 🔧 Troubleshooting Tips

### Common Issues:
1. **Empty visualization**: Make sure all transition table cells are filled
2. **Invalid states**: Ensure target states exist in the states list
3. **Missing transitions**: All state-symbol combinations must have transitions
4. **Regex errors**: Check for balanced parentheses and valid operators

### Best Practices:
1. Start with simple examples before complex ones
2. Use meaningful state names (q0, q1, etc.)
3. Test with both accepting and rejecting strings
4. Use the provided examples as templates

---

## 📚 Educational Use Cases

### For Instructors:
- Use examples during lectures for live demonstrations
- Assign students to build specific DFAs/NFAs
- Show algorithm visualization in real-time
- Compare different approaches to same problem

### For Students:
- Practice building automata from scratch
- Verify homework solutions visually
- Experiment with regex patterns
- Study minimization and equivalence concepts

### For Self-Study:
- Work through textbook examples
- Explore different automata designs
- Understand algorithm execution
- Prepare for exams with visual aids

---

**Happy Learning! 🎓**

*Use these examples to master finite automata theory with interactive visualization!* 