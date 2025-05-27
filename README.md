# DFA & NFA Analyzer - Theory of Computation Toolkit

A modern, web-based analyzer for **Deterministic Finite Automata (DFA)** and **Nondeterministic Finite Automata (NFA)** with professional visualization using D3.js.

## 🌟 Features

### 1. **DFA Simulator & Tester**
- Build DFAs from user input (states, alphabet, transitions, initial/final states)
- Interactive transition table editor
- String testing with step-by-step trace visualization
- Real-time DFA diagram generation
- Animated path tracing for string processing

### 2. **Regular Expression to NFA Converter**
- Convert regex patterns to NFA using Thompson's algorithm
- Support for basic regex operations: union (|), concatenation, Kleene star (*)
- Interactive NFA visualization
- String testing against generated NFAs
- Pre-built regex examples

### 3. **DFA Minimization**
- Minimize DFAs using partition refinement algorithm
- Before/after comparison visualization
- State reduction statistics
- State mapping information
- Performance metrics

### 4. **DFA Equivalence Checking**
- Compare two DFAs to check language equivalence
- Side-by-side DFA comparison
- Clear equivalent/not equivalent results
- Visual feedback for comparison results

## 🚀 Getting Started

### Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No additional software installation required
- Internet connection for Font Awesome icons and D3.js (CDN)

### Installation
1. Clone or download this repository
2. Open `index.html` in your web browser
3. Start building and testing automata!

### Quick Start Example

**DFA Simulator:**
1. Go to the "DFA Simulator" tab
2. Use the default values or enter:
   - States: `q0,q1,q2`
   - Alphabet: `0,1`
   - Initial State: `q0`
   - Final States: `q2`
3. Fill the transition table:
   - δ(q0,0) = q1
   - δ(q0,1) = q0
   - δ(q1,0) = q1
   - δ(q1,1) = q2
   - δ(q2,0) = q1
   - δ(q2,1) = q0
4. Click "Build DFA"
5. Test strings like `010`, `110`, etc.

## 📚 Usage Guide

### DFA Configuration
- **States**: Enter comma-separated state names (e.g., `q0,q1,q2`)
- **Alphabet**: Enter comma-separated symbols (e.g., `0,1,a,b`)
- **Initial State**: Select from dropdown (auto-populated from states)
- **Final States**: Enter comma-separated final states
- **Transitions**: Fill the automatically generated transition table

### Regular Expression Syntax
- **Union**: `a|b` (a or b)
- **Concatenation**: `ab` (a followed by b)
- **Kleene Star**: `a*` (zero or more a's)
- **Grouping**: `(a|b)*` (zero or more of a or b)
- **Examples**: `(a|b)*abb`, `a*b*`, `(ab)*`

### Keyboard Shortcuts
- **Ctrl/Cmd + Enter**: Build/Convert in current tab
- **Escape**: Clear current tab (DFA Simulator only)

## 🎨 Enhanced Visualization Features

### Professional D3.js Visualizations
- **Crystal Clear State Diagrams**: Larger, well-spaced states with professional styling
- **Intelligent Transition Labels**: Background-highlighted labels positioned optimally
- **Smooth Curved Paths**: Curved arrows that avoid overlaps and improve readability
- **Smart Layout Algorithm**: Automatic circular positioning with collision detection
- **Interactive Drag & Drop**: Stable dragging without bouncing, nodes stay in place

### Visual Improvements
- **Enhanced Readability**: 
  - Larger state circles (30px radius) for better visibility
  - High-contrast text with drop shadows
  - Background rectangles for transition labels
  - Professional border styling with shadows

- **Better Color Coding**:
  - Blue borders for initial states with light blue fill
  - Double borders for final states
  - Yellow highlighting for current states during simulation
  - Orange arrows for active transitions

- **Improved Animations**:
  - Smooth state-to-state transitions during string testing
  - Pulse animations for state highlighting
  - Coordinated step-by-step trace synchronization
  - Final state color indication (green for accept, red for reject)

### Interactive Elements
- **Stable Dragging**: States stay where you place them, no bouncing
- **Center Button**: Reset positions and restart layout algorithm
- **Clear Visual Feedback**: Immediate response to user interactions
- **Responsive Design**: Works perfectly on all screen sizes

## 🏗️ Architecture

### Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Visualization**: D3.js v7
- **Icons**: Font Awesome 6
- **Design**: Modern CSS with CSS Grid and Flexbox
- **Responsive**: Mobile-friendly design

### Core Algorithms
- **Thompson's Algorithm**: Regex to NFA conversion
- **Partition Refinement**: DFA minimization
- **BFS/DFS**: DFA equivalence checking
- **Simulation**: String acceptance testing

### File Structure
```
├── index.html          # Main HTML structure
├── styles.css          # Professional CSS styling
├── script.js           # Complete JavaScript functionality
├── README.md           # This documentation
└── [Python files]     # Original Python implementations (reference)
```

## 🔧 Advanced Features

### Error Handling
- Input validation for all automata components
- Comprehensive error messages
- Real-time feedback during construction
- Graceful handling of edge cases

### Performance Optimizations
- Debounced input handlers
- Efficient D3.js rendering
- Optimized algorithms for large automata
- Smooth animations without blocking UI

### Accessibility
- Keyboard navigation support
- High contrast color scheme
- Screen reader friendly elements
- Responsive design for all devices

## 📊 Examples & Use Cases

### Educational Applications
- **Classroom demonstrations**: Interactive teaching tool
- **Student assignments**: Hands-on automata construction
- **Exam preparation**: Visual understanding of concepts
- **Research**: Algorithm comparison and analysis

### Example DFAs
1. **Binary strings ending in '01'**
   - States: q0,q1,q2
   - Alphabet: 0,1
   - Final: q2

2. **Even number of 0's and 1's**
   - States: q00,q01,q10,q11
   - Alphabet: 0,1
   - Final: q00

### Example Regular Expressions
- `(a|b)*abb`: Strings ending with 'abb'
- `a*b*`: Zero or more a's followed by zero or more b's
- `(ab)*`: Even number of alternating a's and b's

## 🐛 Troubleshooting

### Common Issues
1. **Visualization not appearing**: Check browser console for JavaScript errors
2. **D3.js not loading**: Ensure internet connection for CDN resources
3. **Transition table incomplete**: Fill all cells in the transition table
4. **Invalid transitions**: Ensure all target states exist in the states list

### Browser Compatibility
- **Chrome**: Fully supported (recommended)
- **Firefox**: Fully supported
- **Safari**: Supported (minor visual differences)
- **Edge**: Supported
- **Internet Explorer**: Not supported

## 🤝 Contributing

### Development Guidelines
1. Follow ES6+ JavaScript standards
2. Maintain responsive design principles
3. Test across multiple browsers
4. Document new features thoroughly
5. Preserve accessibility features

### Future Enhancements
- [ ] Pushdown Automata (PDA) support
- [ ] Turing Machine simulation
- [ ] Export/import functionality
- [ ] Multiple regex operators (+, ?, etc.)
- [ ] Batch string testing
- [ ] Performance benchmarking

## 📖 Theory Background

### Finite Automata Theory
This tool implements core concepts from formal language theory:
- **DFA**: Deterministic finite state machines
- **NFA**: Nondeterministic finite state machines
- **Regular Languages**: Languages accepted by finite automata
- **Equivalence**: Same language acceptance
- **Minimization**: Optimal state reduction

### Educational Value
Perfect for computer science courses covering:
- Theory of Computation
- Automata Theory
- Formal Languages
- Compiler Design
- Algorithm Analysis

## 📄 License

This project is designed for educational purposes. Feel free to use, modify, and distribute for academic and learning purposes.

## 🙋‍♂️ Support

For questions, issues, or suggestions:
1. Check the troubleshooting section
2. Review example configurations
3. Verify input format requirements
4. Test with simple examples first

---

**Built with ❤️ for Theory of Computation education**

*Transform your understanding of automata theory with professional, interactive visualizations!*