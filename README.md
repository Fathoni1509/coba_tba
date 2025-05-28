# DFA & NFA Web Analyzer

## 📋 Deskripsi Project
Web-based application untuk analisis Deterministic Finite Automata (DFA) dan Non-deterministic Finite Automata (NFA) yang dikembangkan sebagai project mata kuliah Teori Bahasa dan Automata.

Cek langsung:
https://dfa-nfa-visualizer.vercel.app/

## 👥 Tim Pengembang - Kelompok 4
- **Cholif Bima Ardiansyah** - L0123040
- **Fathoni Nur Habibi** - L0123054
- **Gibril Muhammad Alghifari** - L0123059
- **Jabran Javier** - L0123069
- **Josephine Angelia Pramudya** - L0123071

## 🏫 Institusi
**Program Studi Informatika**
**Fakultas Teknologi Informasi dan Sains Data**
**Universitas Sebelas Maret**
**2025**

## ⚙️ Fitur Utama

### 1. 🎮 DFA Simulator
- Interactive DFA builder dengan drag-and-drop interface
- Step-by-step string testing dengan animasi
- Transition table generator
- Multiple example configurations
- Real-time visualization dengan D3.js

### 2. 🔄 Regex to NFA Converter
- Convert regular expressions ke NFA menggunakan Thompson's algorithm
- **Lambda (λ) transitions toggle** - pilihan untuk menampilkan NFAλ atau clean NFA
- Enhanced visualization dengan epsilon transitions
- Step-by-step NFA string testing dengan animasi
- Support untuk operator: `*`, `+`, `?`, `|`, `()`, dan karakter literal

### 3. 🗜️ DFA Minimization
- Minimize DFA menggunakan partition refinement algorithm
- Before/after comparison dengan dual visualization
- Transition table untuk original dan minimized DFA
- Center buttons untuk navigation
- Detailed state reduction analysis

### 4. ⚖️ DFA Equivalence Checker
- Check apakah dua DFA accept bahasa yang sama
- Side-by-side comparison dengan explanatory text
- Interactive input untuk kedua DFA
- Visual feedback untuk equivalence result

## 💻 Teknologi yang Digunakan
- **HTML5** - Structure dan semantic markup
- **CSS3** - Styling dan responsive design
- **JavaScript (ES6+)** - Logic dan interactivity
- **D3.js** - Data visualization dan SVG manipulation

## 🚀 Cara Menjalankan

### Method 1: Using Scripts (Recommended)
```bash
# Windows
start-server.bat

# Unix/Linux/Mac
bash start-server.sh
```

### Method 2: Manual Command
```bash
python -m http.server 8000
```

### Method 3: Using npm (if available)
```bash
npm start
```
### Method 4: Langsung buka html

**Then open browser:** `http://localhost:8000`

## 📁 Struktur File
```
Project Root/
├── 📁 css/
│   └── styles.css      # CSS styling (2000+ lines)
├── 📁 js/
│   └── script.js       # JavaScript logic (5000+ lines)
├── 📁 docs/
│   ├── USAGE.md        # User guide & tutorials
│   └── CHANGELOG.md    # Version history
├── index.html          # Main HTML file
├── README.md           # Project documentation
├── package.json        # Project metadata
├── start-server.bat    # Windows server script
└── start-server.sh     # Unix/Linux server script
```

## 🎯 Fitur Unggulan

### Lambda Transitions Toggle
Fitur unik yang memungkinkan user untuk:
- Melihat NFAλ (dengan lambda transitions)
- Membandingkan dengan clean NFA (tanpa lambda transitions)
- Memahami proses optimisasi Thompson's construction
- Visual distinction dengan dashed orange lines untuk lambda transitions

### Interactive Animations
- Step-by-step execution untuk DFA dan NFA
- Real-time state highlighting
- Smooth transitions dan visual feedback
- Educational value untuk memahami automata execution

### Professional UI/UX
- Modern responsive design
- Consistent color scheme dan typography
- Intuitive navigation dengan tab system
- Comprehensive error handling dan user feedback

## 📚 Educational Value
Project ini dirancang untuk membantu mahasiswa memahami:
- Konsep DFA dan NFA dalam teori komputasi
- Algoritma konversi regex ke NFA
- Proses minimisasi DFA
- Equivalence checking antar automata
- Visualisasi dan animasi untuk pembelajaran interaktif

## 🔧 Development Notes
- Menggunakan reference implementation untuk akurasi algoritma
- Optimized performance untuk handling complex automata
- Cross-browser compatibility
- Mobile-responsive design

---
**© 2025 Kelompok 4 - Universitas Sebelas Maret**
