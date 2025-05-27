from collections import defaultdict

# === Fungsi untuk meminimalkan DFA ===
def minimize_dfa(states, alphabet, transition, start_state, final_states):
    partition = [set(final_states), set(states) - set(final_states)]
    stable = False

    while not stable:
        stable = True
        new_partition = []

        for group in partition:
            splitter = defaultdict(set)
            for state in group:
                signature = []
                for symbol in alphabet:
                    target = transition[state][symbol]
                    for idx, p in enumerate(partition):
                        if target in p:
                            signature.append(idx)
                            break
                splitter[tuple(signature)].add(state)
            if len(splitter) > 1:
                stable = False
            new_partition.extend(splitter.values())
        partition = new_partition

    state_mapping = {}
    for idx, group in enumerate(partition):
        for state in group:
            state_mapping[state] = f'S{idx}'

    new_states = set(state_mapping.values())
    new_start = state_mapping[start_state]
    new_finals = {state_mapping[s] for s in final_states}
    new_transitions = {s: {} for s in new_states}

    for old_state in states:
        new_state = state_mapping[old_state]
        for symbol in alphabet:
            target_old = transition[old_state][symbol]
            target_new = state_mapping[target_old]
            new_transitions[new_state][symbol] = target_new

    return new_states, alphabet, new_transitions, new_start, new_finals, state_mapping

# === Fungsi untuk mengambil input DFA dari user dan memvalidasi ===
def get_dfa_input():
    print("=== INPUT DFA ===")
    states = input("Masukkan state (dipisah koma, contoh: A,B,C): ").replace(" ", "").split(",")
    alphabet = input("Masukkan alfabet (dipisah koma, contoh: 0,1): ").replace(" ", "").split(",")
    start_state = input("Masukkan start state: ").strip()
    final_states = input("Masukkan final states (dipisah koma): ").replace(" ", "").split(",")

    # Validasi awal
    if start_state not in states:
        raise ValueError("Start state harus termasuk dalam daftar state.")
    for f in final_states:
        if f not in states:
            raise ValueError(f"Final state {f} tidak termasuk dalam daftar state.")

    print("\nMasukkan transisi (harus 1 tujuan untuk tiap simbol):")
    transition = {}
    for state in states:
        transition[state] = {}
        for symbol in alphabet:
            dest = input(f"δ({state}, {symbol}) = ").strip()
            if "," in dest:
                raise ValueError(f"Transisi nondeterministik terdeteksi di δ({state}, {symbol}) = {dest}. DFA hanya boleh 1 tujuan.")
            if dest not in states:
                raise ValueError(f"State tujuan '{dest}' tidak valid.")
            transition[state][symbol] = dest

    return set(states), set(alphabet), transition, start_state, set(final_states)

# === MAIN PROGRAM ===
if __name__ == "__main__":
    try:
        states, alphabet, transition, start_state, final_states = get_dfa_input()
        new_states, new_alphabet, new_transitions, new_start, new_finals, state_mapping = minimize_dfa(
            states, alphabet, transition, start_state, final_states
        )

        print("\n=== DFA HASIL MINIMISASI ===")
        print("States:", new_states)
        print("Alphabet:", new_alphabet)
        print("Start State:", new_start)
        print("Final States:", new_finals)
        print("Transitions:")
        for state in new_states:
            for symbol in new_alphabet:
                print(f"  δ({state}, {symbol}) → {new_transitions[state][symbol]}")

        print("\n=== Mapping State Asli ke State Baru ===")
        grouped = defaultdict(list)
        for original, new in state_mapping.items():
            grouped[new].append(original)
        for new_state in sorted(grouped.keys()):
            print(f"{new_state} mewakili: {', '.join(sorted(grouped[new_state]))}")

    except ValueError as e:
        print("\n[INPUT ERROR]", e)
