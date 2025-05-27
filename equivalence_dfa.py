from collections import deque

def make_total_dfa(dfa, full_alphabet):
    states = set(dfa['states'])
    transitions = dict(dfa['transition'])
    dead_state = 'DEAD'
    while dead_state in states:
        dead_state += '_X'
    states.add(dead_state)

    for state in states:
        for symbol in full_alphabet:
            if (state, symbol) not in transitions:
                transitions[(state, symbol)] = dead_state

    for symbol in full_alphabet:
        transitions[(dead_state, symbol)] = dead_state

    return {
        'states': states,
        'alphabet': full_alphabet,
        'transition': transitions,
        'start': dfa['start'],
        'accept': set(dfa['accept'])
    }

def validate_dfa(dfa):
    states = dfa['states']
    alphabet = dfa['alphabet']
    transition = dfa['transition']
    start = dfa['start']
    accept = dfa['accept']

    if start not in states:
        raise ValueError("Start state tidak ada di states.")
    for a in accept:
        if a not in states:
            raise ValueError(f"Accept state '{a}' tidak ada di states.")
    for (state, symbol), target in transition.items():
        if state not in states or target not in states:
            raise ValueError(f"Transisi ({state}, {symbol}) -> {target} tidak valid.")
        if symbol not in alphabet:
            raise ValueError(f"Simbol {symbol} tidak ada di alfabet.")

def are_equivalent(dfa1, dfa2):
    validate_dfa(dfa1)
    validate_dfa(dfa2)
    full_alphabet = set(dfa1['alphabet']) | set(dfa2['alphabet'])
    dfa1 = make_total_dfa(dfa1, full_alphabet)
    dfa2 = make_total_dfa(dfa2, full_alphabet)

    visited = set()
    queue = deque()
    queue.append((dfa1['start'], dfa2['start']))

    while queue:
        s1, s2 = queue.popleft()
        if (s1, s2) in visited:
            continue
        visited.add((s1, s2))

        if (s1 in dfa1['accept']) != (s2 in dfa2['accept']):
            return False

        for symbol in full_alphabet:
            t1 = dfa1['transition'][(s1, symbol)]
            t2 = dfa2['transition'][(s2, symbol)]
            queue.append((t1, t2))

    return True

def input_dfa(index=1):
    print(f"\n=== Masukkan DFA #{index} ===")
    n = int(input("Jumlah state: "))
    states = input("Daftar state (pisahkan dengan spasi): ").split()
    if len(states) != n:
        raise ValueError("Jumlah state tidak sesuai.")
    alphabet = input("Alfabet (pisahkan dengan spasi): ").split()
    start = input("State awal: ")
    accept = input("State final (pisahkan dengan spasi): ").split()

    transition = {}
    print("\nMasukkan fungsi transisi:")
    for state in states:
        for symbol in alphabet:
            target = input(f"Transisi dari {state} dengan '{symbol}': ")
            transition[(state, symbol)] = target

    return {
        'states': set(states),
        'alphabet': set(alphabet),
        'transition': transition,
        'start': start,
        'accept': set(accept)
    }

# Program utama
if __name__ == "__main__":
    try:
        dfa1 = input_dfa(1)
        dfa2 = input_dfa(2)

        print("\nMemeriksa ekuivalensi DFA ...")
        if are_equivalent(dfa1, dfa2):
            print("DFA 1 dan DFA 2 EKUIVALEN")
        else:
            print("DFA 1 dan DFA 2 TIDAK EKUIVALEN")

    except Exception as e:
        print(f"Terjadi kesalahan input: {e}")
