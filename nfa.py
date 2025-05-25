import sys

# Representasi State
class State:
    _id = 0
    def __init__(self):
        self.name = f"q{State._id}"
        State._id += 1
        self.edges = {}  # {symbol: [states]}
        self.epsilon = []  # list of states

    def add_edge(self, symbol, state):
        if symbol not in self.edges:
            self.edges[symbol] = []
        self.edges[symbol].append(state)

class NFA:
    def __init__(self, start, accept):
        self.start = start
        self.accept = accept
        self.states = self._collect_states()

    def _collect_states(self):
        visited = set()
        stack = [self.start]
        result = []

        while stack:
            state = stack.pop()
            if state in visited:
                continue
            visited.add(state)
            result.append(state)
            for targets in state.edges.values():
                stack.extend(targets)
            stack.extend(state.epsilon)
        return result

    def simulate(self, string):
        current = set()
        self._epsilon_closure(self.start, current)

        for c in string:
            next_set = set()
            for state in current:
                if c in state.edges:
                    for target in state.edges[c]:
                        self._epsilon_closure(target, next_set)
            current = next_set
        return self.accept in current

    def _epsilon_closure(self, state, result):
        if state in result:
            return
        result.add(state)
        for next_state in state.epsilon:
            self._epsilon_closure(next_state, result)

    def print_transitions(self):
        print("\n=== Diagram Transisi NFA ===")
        print(f"Start State : {self.start.name}")
        print(f"Final State : {self.accept.name}")
        print("Transisi:")
        for state in sorted(self.states, key=lambda s: int(s.name[1:])):
            for symbol, targets in state.edges.items():
                for t in targets:
                    print(f"  {state.name} --[{symbol}]--> {t.name}")
            for t in state.epsilon:
                print(f"  {state.name} --[ε]--> {t.name}")

def regex_to_nfa(regex):
    def add_concat(r):
        out = ""
        for i in range(len(r) - 1):
            out += r[i]
            if r[i] not in '(|' and r[i+1] not in ')*|)':
                out += '.'
        out += r[-1]
        return out

    def shunt(infix):
        prec = {'*': 3, '.': 2, '|': 1}
        out, stack = '', []
        for c in infix:
            if c in prec:
                while stack and stack[-1] != '(' and prec.get(stack[-1], 0) >= prec[c]:
                    out += stack.pop()
                stack.append(c)
            elif c == '(':
                stack.append(c)
            elif c == ')':
                while stack[-1] != '(':
                    out += stack.pop()
                stack.pop()
            else:
                out += c
        while stack:
            out += stack.pop()
        return out

    def postfix_to_nfa(postfix):
        stack = []
        for c in postfix:
            if c == '*':
                nfa1 = stack.pop()
                start, accept = State(), State()
                start.epsilon.append(nfa1.start)
                start.epsilon.append(accept)
                nfa1.accept.epsilon.append(nfa1.start)
                nfa1.accept.epsilon.append(accept)
                stack.append(NFA(start, accept))
            elif c == '.':
                nfa2 = stack.pop()
                nfa1 = stack.pop()
                nfa1.accept.epsilon.append(nfa2.start)
                stack.append(NFA(nfa1.start, nfa2.accept))
            elif c == '|':
                nfa2 = stack.pop()
                nfa1 = stack.pop()
                start, accept = State(), State()
                start.epsilon.extend([nfa1.start, nfa2.start])
                nfa1.accept.epsilon.append(accept)
                nfa2.accept.epsilon.append(accept)
                stack.append(NFA(start, accept))
            else:
                start, accept = State(), State()
                start.add_edge(c, accept)
                stack.append(NFA(start, accept))
        return stack[0]

    regex = add_concat(regex)
    postfix = shunt(regex)
    return postfix_to_nfa(postfix)



# === Interface Program ===
if __name__ == '__main__':
    print("=== Program Regex ke NFA ===")
    regex = input("Masukkan Regex (contoh: (a|b)*abb): ").strip()
    State._id = 0  # reset penomoran state
    nfa = regex_to_nfa(regex)

    nfa.print_transitions()

    while True:
        string = input("\nMasukkan string untuk diuji (atau ketik 'exit'): ")
        if string.lower() == 'exit':
            break
        if nfa.simulate(string):
            print(f"✔ DITERIMA: '{string}' cocok dengan regex '{regex}'")
        else:
            print(f"✘ DITOLAK : '{string}' TIDAK cocok dengan regex '{regex}'")
