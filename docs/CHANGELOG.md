# Changelog

All notable changes to the DFA & NFA Web Analyzer project will be documented in this file.

## [1.0.0] - 2025-01-28

### 🎉 Initial Release

#### ✨ Features Added
- **DFA Simulator & Tester**
  - Interactive DFA builder with drag-and-drop interface
  - Step-by-step string testing with smooth animations
  - Real-time visualization using D3.js
  - Multiple pre-configured examples
  - Transition table generator
  - Center graph functionality

- **Regex to NFA Converter**
  - Convert regular expressions to NFA using Enhanced Thompson's Construction
  - **Lambda (λ) transitions toggle** - Educational feature to show NFAλ vs clean NFA
  - Support for operators: `*`, `+`, `?`, `|`, `()`, and literal characters
  - Step-by-step NFA string testing with animations
  - Visual distinction for lambda transitions (dashed orange lines)
  - Transition table display for NFAs

- **DFA Minimization**
  - Minimize DFAs using partition refinement algorithm
  - Before/after comparison with dual visualization
  - Transition tables for both original and minimized DFA
  - Center buttons for easy navigation
  - Detailed state reduction statistics

- **DFA Equivalence Checker**
  - Check if two DFAs accept the same language
  - Side-by-side comparison with explanatory text
  - Interactive input for both DFAs
  - Visual feedback for equivalence results
  - Larger layout screens for better visualization

- **About Page**
  - Complete project information
  - Team member credits
  - Feature descriptions
  - Technology stack information

#### 🎨 UI/UX Improvements
- Modern responsive design with consistent color scheme
- Professional tab-based navigation system
- Smooth animations and transitions
- Interactive hover effects and visual feedback
- Mobile-responsive layout
- Consistent blue button styling across all tabs

#### 🔧 Technical Enhancements
- Enhanced Thompson's Construction algorithm
- Optimized state management and naming
- Cross-browser compatibility
- Performance optimizations for complex automata
- Comprehensive error handling
- Real-time validation and feedback

#### 📚 Educational Features
- **Lambda transitions toggle** for understanding NFAλ vs NFA differences
- Step-by-step execution animations
- Visual state highlighting during string processing
- Comprehensive examples and templates
- Interactive learning experience

#### 🏗️ Architecture
- Modular JavaScript architecture
- Clean separation of concerns
- Reusable visualization components
- Consistent API design
- Well-documented code structure

### 🐛 Bug Fixes
- Fixed state transition animations
- Resolved edge cases in regex parsing
- Improved error handling for invalid inputs
- Fixed visualization rendering issues
- Corrected lambda transition processing

### 📖 Documentation
- Comprehensive README with setup instructions
- Detailed feature descriptions
- Code documentation and comments
- Usage examples and tutorials
- Academic project information

### 🎯 Performance
- Optimized D3.js rendering
- Efficient state management
- Reduced memory usage for large automata
- Faster regex to NFA conversion
- Improved animation performance

---

## Development Team - Kelompok 4

- **Cholif Bima Ardiansyah** - L0123040
- **Fathoni Nur Habibi** - L0123054  
- **Gibril Muhammad Alghifari** - L0123059
- **Jabran Javier** - L0123069
- **Josephine Angelia Pramudya** - L0123071

**Program Studi Informatika**  
**Fakultas Teknologi Informasi dan Sains Data**  
**Universitas Sebelas Maret**  
**2025**
