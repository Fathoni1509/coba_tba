# Usage Guide - DFA & NFA Web Analyzer

## 🚀 Quick Start

1. **Setup Local Server**
   ```bash
   cd DFA-NFA-Web-Analyzer
   python -m http.server 8000
   ```

2. **Open in Browser**
   ```
   http://localhost:8000
   ```

3. **Start Exploring!**
   - Use the tab navigation to switch between different tools
   - Try the example configurations for quick testing

---

## 📋 Feature Guides

### 1. 🎮 DFA Simulator

#### Building a DFA
1. **Define States**: Enter comma-separated state names (e.g., `q0,q1,q2`)
2. **Set Alphabet**: Enter symbols (e.g., `0,1` for binary)
3. **Choose Initial State**: Select from dropdown
4. **Set Final States**: Enter accepting states (e.g., `q2`)
5. **Fill Transition Table**: Complete the δ function
6. **Click "Build DFA"**: Generate visualization

#### Testing Strings
1. **Enter Test String**: Type in the input field
2. **Click "Test"**: Watch step-by-step execution
3. **Observe Animation**: See state transitions in real-time
4. **Check Result**: Accepted (green) or Rejected (red)

#### Quick Examples
- **Strings ending in '01'**: Binary strings that end with "01"
- **Even number of 0's**: Strings with even count of 0s
- **Binary multiple of 3**: Numbers divisible by 3
- **With Self-Loops**: Demonstrates circular transitions

### 2. 🔄 Regex to NFA Converter

#### Converting Regular Expressions
1. **Enter Regex**: Type expression (e.g., `(a|b)*abb`)
2. **Choose Output Type**: 
   - ✅ **Toggle ON**: NFAλ with lambda transitions
   - ❌ **Toggle OFF**: Clean NFA without lambdas
3. **Click "Convert to NFA"**: Generate visualization

#### Lambda Transitions Toggle 🎛️
- **NFAλ Mode**: Shows epsilon transitions as dashed orange lines
- **Clean NFA Mode**: Optimized structure without lambda transitions
- **Educational Value**: Compare Thompson's construction vs optimized NFA

#### Supported Operators
- `|` - Union (OR)
- `*` - Kleene star (zero or more)
- `+` - Plus (one or more)  
- `?` - Optional (zero or one)
- `()` - Grouping
- Literal characters: `a`, `b`, `0`, `1`, etc.

#### Testing NFA Strings
1. **Convert Regex First**: Generate NFA
2. **Enter Test String**: Type string to test
3. **Click "Test"**: See NFA execution with animations
4. **Watch Multiple Paths**: Observe non-deterministic behavior

### 3. 🗜️ DFA Minimization

#### Minimizing a DFA
1. **Input Original DFA**: 
   - States, alphabet, initial state, final states
   - Complete transition table
2. **Click "Minimize DFA"**: Apply partition refinement
3. **Compare Results**: Side-by-side before/after view
4. **Analyze Statistics**: See state reduction details

#### Understanding Results
- **Original DFA**: Left visualization
- **Minimized DFA**: Right visualization  
- **Statistics Panel**: Shows reduction metrics
- **Transition Tables**: Compare original vs minimized

### 4. ⚖️ DFA Equivalence Checker

#### Checking Equivalence
1. **Define DFA 1**: Complete first automaton
2. **Define DFA 2**: Complete second automaton
3. **Click "Check Equivalence"**: Run comparison algorithm
4. **View Results**: 
   - ✅ **Equivalent**: Same language accepted
   - ❌ **Not Equivalent**: Different languages

#### Understanding Analysis
- **Visual Comparison**: Side-by-side DFA visualizations
- **Equivalence Status**: Clear result indicator
- **Explanatory Text**: Detailed analysis of why DFAs are/aren't equivalent

---

## 🎨 Visual Elements Guide

### State Visualization
- **Blue Circles**: Regular states
- **Double Circles**: Final/accepting states
- **Yellow Highlight**: Current state during execution
- **Arrow Indicator**: Points to initial state

### Transition Visualization
- **Solid Gray Lines**: Regular transitions
- **Dashed Orange Lines**: Lambda (ε) transitions
- **Yellow Highlight**: Active transition during execution
- **Curved Paths**: Better visibility for complex graphs

### Interactive Controls
- **Drag & Drop**: Move states around
- **Zoom Controls**: +, -, Reset buttons
- **Center Button**: Reset graph position
- **Tab Navigation**: Switch between tools

---

## 💡 Tips & Best Practices

### For DFA Building
- Start with simple examples
- Use descriptive state names
- Test with various string lengths
- Verify with both accepting and rejecting strings

### For Regex to NFA
- Begin with basic patterns like `a*` or `(a|b)`
- Use lambda toggle to understand construction process
- Test the same string on both NFAλ and clean NFA
- Observe how optimization reduces states

### For DFA Minimization
- Try DFAs with obvious redundant states
- Compare state counts before/after
- Understand which states get merged
- Verify that minimized DFA accepts same language

### For Equivalence Checking
- Test DFAs that look different but are equivalent
- Try DFAs with different state counts
- Use simple examples first (like `a*` vs `(a*)*`)
- Understand why certain DFAs are not equivalent

---

## 🔧 Troubleshooting

### Common Issues
1. **Visualization Not Loading**: Refresh browser, check console
2. **Animation Stuck**: Click "Center" button to reset
3. **Invalid Regex**: Check syntax, use supported operators
4. **Transition Table Errors**: Ensure all cells are filled correctly

### Browser Compatibility
- **Recommended**: Chrome, Firefox, Safari, Edge (latest versions)
- **Required**: JavaScript enabled
- **Features**: SVG support, ES6+ compatibility

### Performance Tips
- For large automata, use zoom controls
- Minimize browser tabs for better performance
- Use "Center" button if graph becomes cluttered

---

## 📚 Educational Use

### Learning Objectives
- Understand DFA construction and testing
- Learn Thompson's construction algorithm
- Grasp DFA minimization concepts
- Compare different automata representations

### Classroom Activities
- Build DFAs for specific languages
- Convert regex to NFA and analyze structure
- Minimize DFAs and discuss optimization
- Check equivalence of student-created DFAs

### Assessment Ideas
- Create DFAs for given language descriptions
- Analyze regex to NFA conversion steps
- Explain minimization process
- Prove or disprove DFA equivalence

---

**Happy Learning! 🎓**
