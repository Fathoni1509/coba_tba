from automata.fa.dfa import DFA
import cetak_dfa

# Inisialisasi
array_states = []
array_symbols = []
array_transition = []

print("Program DFA")

# Input jumlah state
while True:
    numStates = int(input("Masukkan banyak state: "))
    if numStates > 0:
        break

# Input nama-nama state
for i in range(numStates):
    state = input(f"State ke-{i+1}: ")
    array_states.append(state)

# Input jumlah symbol
while True:
    numSymbols = int(input("Masukkan banyak symbol: "))
    if numSymbols > 0:
        break

# Input symbol-symbol
for i in range(numSymbols):
    symbol = input(f"Symbol ke-{i+1}: ")
    array_symbols.append(symbol)

# Input transisi
print("\nMasukkan Transisi (pastikan hasil transisi valid):")
for state in array_states:
    row = []
    for symbol in array_symbols:
        while True:
            transition = input(f"Transisi dari '{state}' dengan simbol '{symbol}': ")
            if transition in array_states:
                row.append(transition)
                break
            else:
                print("❌ Transisi tidak valid. Harus merupakan salah satu state.")
    array_transition.append(row)  # simpan satu baris transisi

# Debug tampilan transisi
# print(array_transition)

# Input initial dan final state
while True:
    initial = input("Masukkan initial state: ")
    final = input("Masukkan final state: ")
    if initial in array_states and final in array_states:
        break
    else:
        print("❌ State tidak valid. Harus merupakan salah satu dari state yang telah dimasukkan.")

# Bangun dictionary transisi
def buildTransitions():
    result = {}
    for i in range(len(array_states)):
        result[array_states[i]] = {
            array_symbols[j]: array_transition[i][j]
            for j in range(len(array_symbols))
        }
    return result

# Buat DFA
dfa = DFA(
    states=set(array_states),
    input_symbols=set(array_symbols),
    transitions=buildTransitions(),
    initial_state=initial,
    final_states={final}
)

# Uji string
while True:
    test_string = input("Masukkan string untuk diuji: ")
    # cetak_dfa.draw_dfa_matplotlib(array_states, array_symbols, array_transition, initial, {final})
    if dfa.accepts_input(test_string):
        print("✅ accepted")
    else:
        print("❌ rejected")
    uji_lagi = input("Uji string lagi? (y/n): ")
    if uji_lagi.lower() != 'y':
        print("Terimakasih telah menggunakan program ini")
        break
