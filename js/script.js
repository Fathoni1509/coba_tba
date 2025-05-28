// DFA & NFA Analyzer - Main JavaScript File

// ===== GLOBAL STATE =====
let currentDFA = null;
let currentNFA = null;
let currentVisualization = null;

// ===== UTILITY FUNCTIONS =====
function parseInput(input) {
    return input.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

function showResult(elementId, success, message, details = '') {
    const element = document.getElementById(elementId);
    element.className = `test-result ${success ? 'accepted' : 'rejected'}`;
    element.innerHTML = `
        <i class="fas ${success ? 'fa-check-circle' : 'fa-times-circle'}"></i>
        <strong>${success ? 'ACCEPTED' : 'REJECTED'}</strong>: ${message}
        ${details ? `<br><small>${details}</small>` : ''}
    `;
}

// ===== DFA CLASS =====
class DFA {
    constructor(states, alphabet, transitions, initialState, finalStates) {
        this.states = new Set(states);
        this.alphabet = new Set(alphabet);
        this.transitions = transitions;
        this.initialState = initialState;
        this.finalStates = new Set(finalStates);
        this.currentState = initialState;
    }

    reset() {
        this.currentState = this.initialState;
    }

    step(symbol) {
        if (!this.alphabet.has(symbol)) {
            throw new Error(`Symbol '${symbol}' not in alphabet`);
        }

        const transitionKey = `${this.currentState},${symbol}`;
        if (this.transitions[transitionKey]) {
            this.currentState = this.transitions[transitionKey];
            return this.currentState;
        } else {
            throw new Error(`No transition defined for state '${this.currentState}' and symbol '${symbol}'`);
        }
    }

    accepts(string) {
        this.reset();
        const trace = [this.currentState];

        try {
            for (const symbol of string) {
                this.step(symbol);
                trace.push(this.currentState);
            }

            const accepted = this.finalStates.has(this.currentState);
            return { accepted, trace };
        } catch (error) {
            return { accepted: false, trace, error: error.message };
        }
    }

    getTransitions() {
        const result = [];
        for (const state of this.states) {
            for (const symbol of this.alphabet) {
                const key = `${state},${symbol}`;
                if (this.transitions[key]) {
                    result.push({
                        from: state,
                        symbol: symbol,
                        to: this.transitions[key]
                    });
                }
            }
        }
        return result;
    }
}

// ===== NFA CLASSES =====
class NFAState {
    static idCounter = 0;

    constructor() {
        this.id = NFAState.idCounter++;
        this.name = `q${this.id}`;
        this.transitions = new Map();
        this.epsilonTransitions = [];
    }

    addTransition(symbol, state) {
        if (!this.transitions.has(symbol)) {
            this.transitions.set(symbol, []);
        }
        this.transitions.get(symbol).push(state);
    }

    addEpsilonTransition(state) {
        this.epsilonTransitions.push(state);
    }
}

class NFA {
    constructor(startState, acceptState) {
        this.startState = startState;
        this.acceptState = acceptState;
        this.states = this.collectStates();
    }

    collectStates() {
        const visited = new Set();
        const stack = [this.startState];
        const states = [];

        while (stack.length > 0) {
            const state = stack.pop();
            if (visited.has(state)) continue;

            visited.add(state);
            states.push(state);

            // Add transitions
            for (const targetStates of state.transitions.values()) {
                stack.push(...targetStates);
            }

            // Add epsilon transitions
            stack.push(...state.epsilonTransitions);
        }

        return states;
    }

    epsilonClosure(stateSet) {
        const closure = new Set(stateSet);
        const stack = [...stateSet];

        while (stack.length > 0) {
            const state = stack.pop();
            for (const epsilonTarget of state.epsilonTransitions) {
                if (!closure.has(epsilonTarget)) {
                    closure.add(epsilonTarget);
                    stack.push(epsilonTarget);
                }
            }
        }

        return closure;
    }

    accepts(string) {
        let currentStates = this.epsilonClosure([this.startState]);

        for (const symbol of string) {
            const nextStates = new Set();

            for (const state of currentStates) {
                if (state.transitions.has(symbol)) {
                    for (const target of state.transitions.get(symbol)) {
                        nextStates.add(target);
                    }
                }
            }

            currentStates = this.epsilonClosure([...nextStates]);
        }

        return currentStates.has(this.acceptState);
    }

    acceptsWithTrace(string) {
        let currentStates = this.epsilonClosure([this.startState]);
        const trace = [];

        // Initial state configuration
        trace.push({
            step: 0,
            symbol: null,
            currentStates: [...currentStates].map(s => s.name),
            description: `Initial state: ε-closure({${this.startState.name}}) = {${[...currentStates].map(s => s.name).join(', ')}}`
        });

        for (let i = 0; i < string.length; i++) {
            const symbol = string[i];
            const nextStates = new Set();

            // Process symbol transitions
            for (const state of currentStates) {
                if (state.transitions.has(symbol)) {
                    for (const target of state.transitions.get(symbol)) {
                        nextStates.add(target);
                    }
                }
            }

            // Apply epsilon closure
            currentStates = this.epsilonClosure([...nextStates]);

            trace.push({
                step: i + 1,
                symbol: symbol,
                currentStates: [...currentStates].map(s => s.name),
                description: `Read '${symbol}': ε-closure({${[...nextStates].map(s => s.name).join(', ') || '∅'}}) = {${[...currentStates].map(s => s.name).join(', ') || '∅'}}`
            });
        }

        const accepted = currentStates.has(this.acceptState);

        return {
            accepted: accepted,
            trace: trace,
            finalStates: [...currentStates].map(s => s.name),
            acceptState: this.acceptState.name
        };
    }

    getTransitions() {
        const transitions = [];

        for (const state of this.states) {
            // Regular transitions
            for (const [symbol, targets] of state.transitions) {
                for (const target of targets) {
                    transitions.push({
                        from: state.name,
                        symbol: symbol,
                        to: target.name
                    });
                }
            }

            // Epsilon transitions
            for (const target of state.epsilonTransitions) {
                transitions.push({
                    from: state.name,
                    symbol: 'ε',
                    to: target.name
                });
            }
        }

        return transitions;
    }
}

// ===== REGEX TO NFA CONVERTER =====
class RegexToNFA {
    static convert(regex) {
        const postfix = this.infixToPostfix(this.addConcatenation(regex));
        return this.postfixToNFA(postfix);
    }

    static addConcatenation(regex) {
        let result = '';
        for (let i = 0; i < regex.length - 1; i++) {
            result += regex[i];
            if (regex[i] !== '(' && regex[i] !== '|' &&
                regex[i + 1] !== ')' && regex[i + 1] !== '*' &&
                regex[i + 1] !== '|' && regex[i + 1] !== '+') {
                result += '.';
            }
        }
        result += regex[regex.length - 1];
        return result;
    }

    static infixToPostfix(infix) {
        const precedence = { '|': 1, '.': 2, '*': 3, '+': 3 };
        const output = [];
        const operators = [];

        for (const char of infix) {
            if (char === '(') {
                operators.push(char);
            } else if (char === ')') {
                while (operators.length > 0 && operators[operators.length - 1] !== '(') {
                    output.push(operators.pop());
                }
                operators.pop(); // Remove '('
            } else if (precedence[char]) {
                while (operators.length > 0 &&
                       operators[operators.length - 1] !== '(' &&
                       precedence[operators[operators.length - 1]] >= precedence[char]) {
                    output.push(operators.pop());
                }
                operators.push(char);
            } else {
                output.push(char);
            }
        }

        while (operators.length > 0) {
            output.push(operators.pop());
        }

        return output.join('');
    }

    static postfixToNFA(postfix) {
        const stack = [];

        for (const char of postfix) {
            if (char === '*') {
                const nfa = stack.pop();
                const start = new NFAState();
                const accept = new NFAState();

                start.addEpsilonTransition(nfa.startState);
                start.addEpsilonTransition(accept);
                nfa.acceptState.addEpsilonTransition(nfa.startState);
                nfa.acceptState.addEpsilonTransition(accept);

                stack.push(new NFA(start, accept));
            } else if (char === '+') {
                const nfa = stack.pop();
                const start = new NFAState();
                const accept = new NFAState();

                start.addEpsilonTransition(nfa.startState);
                nfa.acceptState.addEpsilonTransition(nfa.startState);
                nfa.acceptState.addEpsilonTransition(accept);

                stack.push(new NFA(start, accept));
            } else if (char === '.') {
                const nfa2 = stack.pop();
                const nfa1 = stack.pop();

                nfa1.acceptState.addEpsilonTransition(nfa2.startState);
                stack.push(new NFA(nfa1.startState, nfa2.acceptState));
            } else if (char === '|') {
                const nfa2 = stack.pop();
                const nfa1 = stack.pop();
                const start = new NFAState();
                const accept = new NFAState();

                start.addEpsilonTransition(nfa1.startState);
                start.addEpsilonTransition(nfa2.startState);
                nfa1.acceptState.addEpsilonTransition(accept);
                nfa2.acceptState.addEpsilonTransition(accept);

                stack.push(new NFA(start, accept));
            } else {
                // Character
                const start = new NFAState();
                const accept = new NFAState();
                start.addTransition(char, accept);
                stack.push(new NFA(start, accept));
            }
        }

        return stack[0];
    }
}

// ===== OPTIMIZED REGEX TO NFA CONVERTER =====
class OptimizedRegexToNFA {
    static convert(regex) {
        try {
            const postfix = this.infixToPostfix(this.addConcatenation(regex));
            const nfa = this.postfixToNFA(postfix);
            return this.optimizeNFA(nfa);
        } catch (error) {
            console.error('OptimizedRegexToNFA error:', error);
            // Fall back to original Thompson's construction
            return RegexToNFA.convert(regex);
        }
    }

    static addConcatenation(regex) {
        let result = '';
        for (let i = 0; i < regex.length - 1; i++) {
            result += regex[i];
            if (regex[i] !== '(' && regex[i] !== '|' &&
                regex[i + 1] !== ')' && regex[i + 1] !== '*' &&
                regex[i + 1] !== '|' && regex[i + 1] !== '+') {
                result += '.';
            }
        }
        result += regex[regex.length - 1];
        return result;
    }

    static infixToPostfix(infix) {
        const precedence = { '|': 1, '.': 2, '*': 3, '+': 3 };
        const output = [];
        const operators = [];

        for (const char of infix) {
            if (char === '(') {
                operators.push(char);
            } else if (char === ')') {
                while (operators.length > 0 && operators[operators.length - 1] !== '(') {
                    output.push(operators.pop());
                }
                operators.pop(); // Remove '('
            } else if (precedence[char]) {
                while (operators.length > 0 &&
                       operators[operators.length - 1] !== '(' &&
                       precedence[operators[operators.length - 1]] >= precedence[char]) {
                    output.push(operators.pop());
                }
                operators.push(char);
            } else {
                output.push(char);
            }
        }

        while (operators.length > 0) {
            output.push(operators.pop());
        }

        return output.join('');
    }

    static postfixToNFA(postfix) {
        const stack = [];

        for (const char of postfix) {
            if (char === '*') {
                const nfa = stack.pop();
                // Create optimized Kleene star: add self-loop to start state
                nfa.startState.addEpsilonTransition(nfa.acceptState);
                nfa.acceptState.addEpsilonTransition(nfa.startState);
                stack.push(nfa);
            } else if (char === '+') {
                const nfa = stack.pop();
                // For +, just add self-loop (at least one occurrence)
                nfa.acceptState.addEpsilonTransition(nfa.startState);
                stack.push(nfa);
            } else if (char === '.') {
                const nfa2 = stack.pop();
                const nfa1 = stack.pop();

                // Direct concatenation: merge accept state of nfa1 with start state of nfa2
                this.mergeStates(nfa1.acceptState, nfa2.startState);
                stack.push(new NFA(nfa1.startState, nfa2.acceptState));
            } else if (char === '|') {
                const nfa2 = stack.pop();
                const nfa1 = stack.pop();
                const start = new NFAState();
                const accept = new NFAState();

                start.addEpsilonTransition(nfa1.startState);
                start.addEpsilonTransition(nfa2.startState);
                nfa1.acceptState.addEpsilonTransition(accept);
                nfa2.acceptState.addEpsilonTransition(accept);

                stack.push(new NFA(start, accept));
            } else {
                // Character
                const start = new NFAState();
                const accept = new NFAState();
                start.addTransition(char, accept);
                stack.push(new NFA(start, accept));
            }
        }

        return stack[0];
    }

    static mergeStates(state1, state2) {
        // Merge state2 into state1
        // Copy all transitions from state2 to state1
        for (const [symbol, targets] of state2.transitions) {
            for (const target of targets) {
                state1.addTransition(symbol, target);
            }
        }

        // Copy epsilon transitions
        for (const target of state2.epsilonTransitions) {
            state1.addEpsilonTransition(target);
        }
    }

    static optimizeNFA(nfa) {
        try {
            // Remove epsilon transitions and simplify structure
            this.removeEpsilonTransitions(nfa);
            this.removeUnreachableStates(nfa);
            return nfa;
        } catch (error) {
            console.error('Error optimizing NFA:', error);
            // Return the original NFA without optimization
            return nfa;
        }
    }

    static removeEpsilonTransitions(nfa) {
        // Compute epsilon closure for each state
        const epsilonClosure = new Map();

        for (const state of nfa.states) {
            epsilonClosure.set(state, this.computeEpsilonClosure(state));
        }

        // Add direct transitions for epsilon closures
        for (const state of nfa.states) {
            const closure = epsilonClosure.get(state);

            for (const closureState of closure) {
                // Copy regular transitions from closure states
                for (const [symbol, targets] of closureState.transitions) {
                    if (symbol !== 'ε') {
                        for (const target of targets) {
                            state.addTransition(symbol, target);
                        }
                    }
                }
            }
        }

        // Remove epsilon transitions
        for (const state of nfa.states) {
            state.epsilonTransitions = [];
        }
    }

    static computeEpsilonClosure(state) {
        const closure = new Set([state]);
        const stack = [state];

        while (stack.length > 0) {
            const current = stack.pop();
            for (const target of current.epsilonTransitions) {
                if (!closure.has(target)) {
                    closure.add(target);
                    stack.push(target);
                }
            }
        }

        return closure;
    }

    static removeUnreachableStates(nfa) {
        const reachable = new Set();
        const stack = [nfa.startState];

        while (stack.length > 0) {
            const state = stack.pop();
            if (reachable.has(state)) continue;

            reachable.add(state);

            // Add reachable states from regular transitions
            for (const targets of state.transitions.values()) {
                for (const target of targets) {
                    if (!reachable.has(target)) {
                        stack.push(target);
                    }
                }
            }

            // Add reachable states from epsilon transitions
            for (const target of state.epsilonTransitions) {
                if (!reachable.has(target)) {
                    stack.push(target);
                }
            }
        }

        // Update states array to only include reachable states
        nfa.states = nfa.states.filter(state => reachable.has(state));
    }
}

// ===== OPTIMIZED REGEX TO NFA CONVERTER =====
// Uses advanced state optimization algorithms for minimal NFA generation
class ReferenceRegexToNFA {
    static convert(regex, showLambdaTransitions = false) {
        try {
            console.log('ReferenceRegexToNFA: Converting regex:', regex);
            console.log('🔧 Show lambda transitions:', showLambdaTransitions);

            // For now, use optimized Thompson's construction with better state management
            // This provides better results than standard Thompson's while being stable

            // Reset state counter for consistent naming
            this.stateIdCounter = 0;

            // Use our optimized approach
            return this.createOptimizedNFA(regex, showLambdaTransitions);

        } catch (error) {
            console.error('ReferenceRegexToNFA error:', error);
            // Fallback to Thompson's construction
            return RegexToNFA.convert(regex);
        }
    }

    // ===== OPTIMIZED NFA CONSTRUCTION =====
    // Following advanced 5-stage pipeline: parseRegex -> constructNFAl -> trivialStates -> removelTransitions -> removeUnreachable
    static createOptimizedNFA(regex, showLambdaTransitions = false) {
        console.log('🎯 Using optimized 5-stage pipeline for:', regex);
        console.log('🔧 Show lambda transitions:', showLambdaTransitions);

        try {
            // Set global regex variable for parsing
            window.regex_global = regex;

            // Stage 1: Parse regex to operation tree
            const tree = this.gitHubParseRegex(regex);
            if (tree === -1) {
                throw new Error('Failed to parse regex');
            }
            console.log('🌳 Parsed tree:', tree);

            // Stage 2: Construct NFAλ (NFA with lambda transitions)
            const nfaLambda = this.gitHubConstructNFAl(tree);
            console.log('🔗 NFAλ created with', nfaLambda.states, 'states');

            // Stage 3: Remove trivial states (key optimization)
            const optimizedNFALambda = this.gitHubTrivialStates(nfaLambda);
            console.log('⚡ After trivial states removal:', optimizedNFALambda.states, 'states');

            // If user wants to see lambda transitions, return NFAλ
            if (showLambdaTransitions) {
                console.log('🔗 Returning NFAλ with lambda transitions');
                return this.convertGitHubNFAToOurFormat(optimizedNFALambda, true);
            }

            // Stage 4: Remove lambda transitions
            const nfaTransition = this.gitHubRemoveLTransitions(this.gitHubDeepCopyAutomaton(optimizedNFALambda));
            console.log('✨ After lambda removal:', nfaTransition.states, 'states');

            // Stage 5: Remove unreachable states
            const finalNFA = this.gitHubRemoveUnreachable(this.gitHubDeepCopyAutomaton(nfaTransition), nfaTransition);
            console.log('🎯 Final NFA has', finalNFA.states, 'states');

            // Convert to our NFA format
            return this.convertGitHubNFAToOurFormat(finalNFA, false);

        } catch (error) {
            console.error('❌ Error in optimized algorithm:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }

    static isSimplePattern(regex) {
        // Check if it's a simple pattern we can handle directly
        const simplePatterns = [
            /^[a-z]\*$/,           // a*
            /^[a-z]\*[a-z]\*$/,    // a*b*
            /^\([a-z]\|[a-z]\)\*$/, // (a|b)*
            /^[a-z]\+$/,           // a+
            /^[a-z][a-z]$/         // ab
        ];

        return simplePatterns.some(pattern => pattern.test(regex));
    }

    static createDirectSimpleNFA(regex) {
        console.log('📝 Creating direct simple NFA for:', regex);

        // a* pattern
        if (/^[a-z]\*$/.test(regex)) {
            const char = regex[0];
            return this.createSimpleStarNFA(char);
        }

        // a*b* pattern
        if (/^[a-z]\*[a-z]\*$/.test(regex)) {
            const char1 = regex[0];
            const char2 = regex[2];
            return this.createSimpleConcatStarNFA(char1, char2);
        }

        // (a|b)* pattern
        if (/^\([a-z]\|[a-z]\)\*$/.test(regex)) {
            const char1 = regex[1];
            const char2 = regex[3];
            return this.createSimpleAlternationStarNFA(char1, char2);
        }

        // Fallback to optimized method
        return this.createGitHubBasedNFA(regex);
    }

    static createSimpleStarNFA(char) {
        // a* should have 1 state that accepts and loops on 'a'
        const state = new NFAState();
        state.name = 'q0';
        state.addTransition(char, state); // Self loop

        const nfa = new NFA(state, state); // Start and accept are the same
        nfa.states = [state];

        console.log(`✅ Created simple a* NFA with 1 state`);
        return nfa;
    }

    static createSimpleConcatStarNFA(char1, char2) {
        // a*b* should have 2 states
        const state0 = new NFAState();
        state0.name = 'q0';
        const state1 = new NFAState();
        state1.name = 'q1';

        state0.addTransition(char1, state0); // a loop on state 0
        state0.addEpsilonTransition(state1);  // epsilon to state 1
        state1.addTransition(char2, state1); // b loop on state 1

        const nfa = new NFA(state0, state1);
        nfa.states = [state0, state1];

        console.log(`✅ Created simple a*b* NFA with 2 states`);
        return nfa;
    }

    static createSimpleAlternationStarNFA(char1, char2) {
        // (a|b)* should have 1 state that accepts and loops on both 'a' and 'b'
        const state = new NFAState();
        state.name = 'q0';
        state.addTransition(char1, state); // a loop
        state.addTransition(char2, state); // b loop

        const nfa = new NFA(state, state); // Start and accept are the same
        nfa.states = [state];

        console.log(`✅ Created simple (a|b)* NFA with 1 state`);
        return nfa;
    }

    // Fallback to optimized method for complex patterns
    static createGitHubBasedNFA(regex) {
        console.log('🔧 Using optimized method for complex pattern:', regex);

        try {
            // Stage 1: Parse regex into operation tree
            const tree = this.parseRegexToTree(regex);
            console.log('🌳 Parsed tree:', tree);

            // Stage 2: Construct NFAλ (NFA with lambda transitions)
            const nfaLambda = this.constructGitHubNFALambda(tree);
            console.log('🔗 NFAλ created with', nfaLambda.states, 'states');

            // Stage 3: Remove trivial states (GitHub's key optimization)
            const optimizedNFALambda = this.gitHubTrivialStates(this.deepCopyGitHubAutomaton(nfaLambda));
            console.log('⚡ After trivial states removal:', optimizedNFALambda.states, 'states');

            // Stage 4: Remove lambda transitions
            const nfaTransition = this.gitHubRemoveLTransitions(this.deepCopyGitHubAutomaton(optimizedNFALambda));
            console.log('✨ After lambda removal:', nfaTransition.states, 'states');

            // Stage 5: Remove unreachable states
            const finalNFA = this.gitHubRemoveUnreachable(this.deepCopyGitHubAutomaton(nfaTransition), nfaTransition);
            console.log('🎯 Final NFA has', finalNFA.states, 'states');

            // Convert GitHub format to our NFA format
            return this.convertGitHubNFAToOurFormat(finalNFA);

        } catch (error) {
            console.error('❌ Error in optimized algorithm:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }

    // ===== ADVANCED IMPLEMENTATION METHODS =====

    // Stage 2: Construct NFAλ (NFA with lambda transitions) - optimized format
    static constructGitHubNFALambda(tree) {
        const nfa = {
            alphabet: new Set(),
            states: 0,
            start: 0,
            edges: [],
            outgoing: [],
            incoming: [],
            accepting: new Set()
        };

        const constructNFAl = (node) => {
            switch (node.type) {
                case "or":
                    nfa.states++; // Add starting state
                    const oldaccepting = new Set();
                    for (let i = 0; i < node.value.length; i++) {
                        const NFAltemp = constructNFAl(node.value[i]); // Build NFA's for all parts
                        NFAltemp.alphabet.forEach(val => nfa.alphabet.add(val));
                        this.mergeGitHubEdges(nfa, NFAltemp);
                        this.addGitHubTransition(nfa, 0, NFAltemp.start + nfa.states, "0");
                        oldaccepting.add([...NFAltemp.accepting][0] + nfa.states);
                        nfa.states += NFAltemp.states;
                    }
                    nfa.states++; // Add accepting state
                    oldaccepting.forEach(val => {
                        this.addGitHubTransition(nfa, val, nfa.states - 1, "0");
                    });
                    nfa.accepting.add(nfa.states - 1);
                    return nfa;

                case "concat":
                    let prev;
                    for (let i = 0; i < node.value.length; i++) {
                        const NFAltemp = constructNFAl(node.value[i]); // Build NFA's for all parts
                        NFAltemp.alphabet.forEach(val => nfa.alphabet.add(val));
                        this.mergeGitHubEdges(nfa, NFAltemp);
                        if (i === 0) {
                            nfa.start = NFAltemp.start;
                        } else {
                            this.addGitHubTransition(nfa, prev, NFAltemp.start + nfa.states, "0");
                        }
                        if (i === node.value.length - 1) {
                            nfa.accepting.add([...NFAltemp.accepting][0] + nfa.states);
                        }
                        prev = [...NFAltemp.accepting][0] + nfa.states;
                        nfa.states += NFAltemp.states;
                    }
                    return nfa;

                case "star":
                    const NFAltemp = constructNFAl(node.value); // Build NFA for part to be starred
                    this.addGitHubTransition(NFAltemp, NFAltemp.states, NFAltemp.start, "0");
                    this.addGitHubTransition(NFAltemp, [...NFAltemp.accepting][0], NFAltemp.states, "0");
                    NFAltemp.states++;
                    NFAltemp.accepting = new Set([NFAltemp.states - 1]);
                    NFAltemp.start = NFAltemp.states - 1;
                    return NFAltemp;

                case "letter":
                    nfa.alphabet.add(node.value);
                    nfa.states = 2;
                    this.addGitHubTransition(nfa, 0, 1, node.value);
                    nfa.accepting.add(1);
                    return nfa;

                case "lambda":
                    nfa.states = 1;
                    nfa.accepting.add(0);
                    return nfa;

                default:
                    throw new Error("Unknown type: " + node.type);
            }
        };

        return constructNFAl(tree);
    }

    // ===== OPTIMIZED PARSING IMPLEMENTATION =====

    // Advanced regex parser (optimized implementation)
    static gitHubParseRegex(regex) {
        window.regex_global = regex;
        const stream = {
            string: regex,
            pos: 0,
            cur: function() { return this.string[this.pos]; },
            done: function() { return this.pos === this.string.length; }
        };

        try {
            const tree = this.gitHubParseExpr(stream);
            if (!stream.done()) {
                return -1;
            }
            return tree;
        } catch (err) {
            return -1;
        }
    }

    static gitHubParseExpr(stream) {
        const terms = [];
        while (!stream.done()) {
            terms.push(this.gitHubParseTerm(stream));
            if (!stream.done() && stream.cur() === '|') {
                stream.pos++;
            } else {
                break;
            }
        }

        if (terms.length === 0) {
            throw new Error("Empty expression");
        } else if (terms.length === 1) {
            return terms[0];
        } else {
            return { type: "or", value: terms };
        }
    }

    static gitHubParseTerm(stream) {
        const concats = [];
        while (!stream.done()) {
            const concat = this.gitHubParseConcat(stream);
            if (concat !== undefined) {
                if (Array.isArray(concat)) { // In case of +, count as 2 concats
                    concats.push(concat[0]);
                    concats.push(concat[1]);
                } else {
                    concats.push(concat);
                }
            } else {
                break;
            }
        }

        if (concats.length === 0) {
            throw new Error("Empty term");
        } else if (concats.length === 1) {
            return concats[0];
        } else {
            return { type: "concat", value: concats };
        }
    }

    static gitHubParseConcat(stream) {
        const atom = this.gitHubParseAtom(stream);
        if (atom !== undefined && !stream.done() && stream.cur() === "*") {
            stream.pos++;
            return { type: "star", value: atom };
        } else if (atom !== undefined && !stream.done() && stream.cur() === "+") {
            stream.pos++;
            return [ // At least 1, concat of atom and atom*
                atom,
                { type: "star", value: atom }
            ];
        } else {
            return atom;
        }
    }

    static gitHubParseAtom(stream) {
        if (stream.done()) {
            throw new Error("Missing atom");
        } else if (stream.cur().toUpperCase() !== stream.cur().toLowerCase()) { // Is letter
            stream.pos++;
            return { type: "letter", value: stream.string[stream.pos - 1] };
        } else if (stream.cur() === '0') {
            stream.pos++;
            return { type: "lambda", value: undefined };
        } else if (stream.cur() === '(') {
            stream.pos++;
            const expr = this.gitHubParseExpr(stream);
            if (!stream.done() && stream.cur() === ')') {
                stream.pos++;
                return expr;
            } else {
                throw new Error("Missing )");
            }
        } else {
            return undefined;
        }
    }

    // Advanced NFAλ constructor (optimized implementation)
    static gitHubConstructNFAl(tree) {
        const nfa = {
            alphabet: new Set(),
            states: 0,
            start: 0,
            edges: [],
            outgoing: [],
            incoming: [],
            accepting: new Set()
        };

        const constructNFAl = (node) => {
            switch (node.type) {
                case "or":
                    nfa.states++; // Add starting state
                    const oldaccepting = new Set();
                    for (let i = 0; i < node.value.length; i++) {
                        const NFAltemp = this.gitHubConstructNFAl(node.value[i]); // Build NFA's for all parts
                        NFAltemp.alphabet.forEach(val => nfa.alphabet.add(val));
                        this.mergeGitHubEdges(nfa, NFAltemp);
                        this.addGitHubTransition(nfa, 0, NFAltemp.start + nfa.states, "0");
                        oldaccepting.add([...NFAltemp.accepting][0] + nfa.states);
                        nfa.states += NFAltemp.states;
                    }
                    nfa.states++; // Add accepting state
                    oldaccepting.forEach(val => {
                        this.addGitHubTransition(nfa, val, nfa.states - 1, "0");
                    });
                    nfa.accepting.add(nfa.states - 1);
                    return nfa;

                case "concat":
                    let NFAltemp = this.gitHubConstructNFAl(node.value[0]);
                    for (let i = 1; i < node.value.length; i++) {
                        const NFAltemp2 = this.gitHubConstructNFAl(node.value[i]);
                        NFAltemp2.alphabet.forEach(val => NFAltemp.alphabet.add(val));
                        this.addGitHubTransition(NFAltemp, [...NFAltemp.accepting][0], NFAltemp2.start + NFAltemp.states, "0");
                        this.mergeGitHubEdges(NFAltemp, NFAltemp2);
                        NFAltemp.accepting = new Set();
                        NFAltemp2.accepting.forEach(val => NFAltemp.accepting.add(val + NFAltemp.states));
                        NFAltemp.states += NFAltemp2.states;
                    }
                    return NFAltemp;

                case "star":
                    const NFAltemp3 = this.gitHubConstructNFAl(node.value); // Build NFA for part to be starred
                    this.addGitHubTransition(NFAltemp3, NFAltemp3.states, NFAltemp3.start, "0");
                    this.addGitHubTransition(NFAltemp3, [...NFAltemp3.accepting][0], NFAltemp3.states, "0");
                    NFAltemp3.states++;
                    NFAltemp3.accepting = new Set([NFAltemp3.states - 1]);
                    NFAltemp3.start = NFAltemp3.states - 1;
                    return NFAltemp3;

                case "letter":
                    nfa.alphabet.add(node.value);
                    nfa.states = 2;
                    this.addGitHubTransition(nfa, 0, 1, node.value);
                    nfa.accepting.add(1);
                    return nfa;

                case "lambda":
                    nfa.states = 1;
                    nfa.accepting.add(0);
                    return nfa;

                default:
                    throw new Error("Unknown type: " + node.type);
            }
        };

        return constructNFAl(tree);
    }

    // Optimized helper methods
    static mergeGitHubEdges(orig, temp) {
        for (let i = 0; i < temp.states; i++) {
            if (temp.edges[i] !== undefined) {
                for (const symbol in temp.edges[i]) {
                    temp.edges[i][symbol].forEach(value => {
                        this.addGitHubTransition(orig, i + orig.states, value + orig.states, symbol);
                    });
                }
            }
        }
    }

    static addGitHubTransition(fa, from, to, symbol) {
        if (fa.edges[from] === undefined) {
            fa.edges[from] = {};
        }
        if (fa.edges[from][symbol] === undefined) {
            fa.edges[from][symbol] = new Set([to]);
        } else {
            if (fa.edges[from][symbol].has(to)) {
                return false; // Transition already exists
            }
            fa.edges[from][symbol].add(to);
        }
        if (fa.outgoing[from] === undefined) {
            fa.outgoing[from] = 1;
        } else {
            fa.outgoing[from]++;
        }
        if (fa.incoming[to] === undefined) {
            fa.incoming[to] = 1;
        } else {
            fa.incoming[to]++;
        }
        return true;
    }

    static removeGitHubTransition(fa, from, to, symbol) {
        if (fa.edges[from] && fa.edges[from][symbol] && fa.edges[from][symbol].has(to)) {
            fa.outgoing[from]--;
            fa.incoming[to]--;
            fa.edges[from][symbol].delete(to);
        }
    }

    // Stage 3: Remove trivial states (optimized implementation)
    static gitHubTrivialStates(nfa) {
        for (let i = nfa.states - 1; i >= 0; i--) {
            let removed = false;
            if (nfa.outgoing[i] === 1) {
                for (const symbol in nfa.edges[i]) {
                    if (symbol === "0" && !nfa.edges[i][symbol].has(i) &&
                        nfa.edges[i][symbol] !== undefined && nfa.edges[i][symbol].size !== 0) {
                        this.gitHubRemoveTrivialState(nfa, i, [...nfa.edges[i][symbol]][0], false);
                        removed = true;
                        break;
                    }
                }
            }
            if (nfa.incoming[i] === 1 && !removed) {
                for (let j = 0; j < nfa.states; j++) {
                    if (removed) break;
                    if (nfa.edges[j] === undefined || nfa.edges[j]["0"] === undefined) continue;

                    const it = nfa.edges[j]["0"].values();
                    for (let val = it.next().value; val !== undefined; val = it.next().value) {
                        if (val === i) {
                            this.gitHubRemoveTrivialState(nfa, i, j, true);
                            removed = true;
                            break;
                        }
                    }
                }
            }
        }
        return nfa;
    }

    static gitHubRemoveTrivialState(nfa, state, tofr, tag) {
        if (nfa.accepting.has(state) || nfa.start === state) return;

        if (!tag) { // Trivial outgoing
            for (let i = 0; i < nfa.states; i++) {
                for (const symbol in nfa.edges[i]) {
                    nfa.edges[i][symbol].forEach(value => {
                        if (value === state) {
                            this.addGitHubTransition(nfa, i, tofr, symbol);
                            this.removeGitHubTransition(nfa, i, state, symbol);
                        }
                    });
                }
            }
            this.removeGitHubTransition(nfa, state, tofr, "0");
        } else { // Trivial incoming
            for (const symbol in nfa.edges[state]) {
                nfa.edges[state][symbol].forEach(value => {
                    this.addGitHubTransition(nfa, tofr, value, symbol);
                    this.removeGitHubTransition(nfa, state, value, symbol);
                });
            }
            this.removeGitHubTransition(nfa, tofr, state, "0");
        }
        this.gitHubRemoveState(nfa, state);
    }

    // Optimized removeState with proper state renumbering (CRITICAL!)
    static gitHubRemoveState(fa, state) {
        if (fa.edges[state] !== undefined) {
            for (const symbol in fa.edges[state]) {
                fa.edges[state][symbol].forEach(val => {
                    this.removeGitHubTransition(fa, state, val, symbol);
                });
            }
        }

        // Update edges array number now that a state has been deleted
        for (let i = 0; i < fa.states; i++) {
            if (fa.edges[i] === undefined) continue;
            for (const symbol in fa.edges[i]) {
                fa.edges[i][symbol].forEach(val => {
                    if (val === state) {
                        this.removeGitHubTransition(fa, i, state, symbol);
                    }
                });
            }
            for (const symbol in fa.edges[i]) {
                const newSet = new Set();
                fa.edges[i][symbol].forEach(value => {
                    if (value >= state) {
                        newSet.add(value - 1);
                    } else {
                        newSet.add(value);
                    }
                });
                fa.edges[i][symbol] = newSet;
            }
        }

        if (fa.start >= state) {
            fa.start--;
        }

        const newAccepting = new Set();
        fa.accepting.forEach(val => {
            if (val >= state) {
                newAccepting.add(val - 1);
            } else {
                newAccepting.add(val);
            }
        });
        fa.accepting = newAccepting;

        for (let i = state; i < fa.states; i++) {
            fa.edges[i] = fa.edges[i + 1];
            fa.outgoing[i] = fa.outgoing[i + 1];
            fa.incoming[i] = fa.incoming[i + 1];
        }
        fa.states--;
    }

    // Stage 4: Remove lambda transitions (optimized implementation)
    static gitHubRemoveLTransitions(nfa) {
        const closure = this.gitHubLClosure(nfa); // Calculate which states can be reached from which states using only lambda transitions
        nfa.ledges = new Set();
        nfa.newedges = new Set();
        nfa.normaledges = new Set();
        nfa.newaccepting = [];

        for (let i = 0; i < nfa.states; i++) {
            if (nfa.edges[i] === undefined) continue;
            for (const symbol in nfa.edges[i]) {
                if (nfa.edges[i][symbol] !== undefined) {
                    nfa.edges[i][symbol].forEach(val => {
                        if (symbol !== "0") {
                            nfa.normaledges.add([i, val, symbol]);
                        } else {
                            nfa.ledges.add([i, val, "0"]);
                        }
                    });
                }
            }
        }

        for (let i = 0; i < nfa.states; i++) {
            closure[i].forEach(val => {
                if (nfa.edges[val] !== undefined) {
                    for (const symbol in nfa.edges[val]) {
                        if (symbol !== "0" && nfa.edges[val][symbol] !== undefined) {
                            nfa.edges[val][symbol].forEach(val2 => {
                                if (nfa.edges[i] === undefined || nfa.edges[i][symbol] === undefined ||
                                    !nfa.edges[i][symbol].has(val2)) {
                                    if (this.addGitHubTransition(nfa, i, val2, symbol)) {
                                        nfa.newedges.add([i, val2, symbol]);
                                    }
                                }
                            });
                        }
                    }
                }
                if (nfa.accepting.has(val) && !nfa.accepting.has(i)) {
                    nfa.accepting.add(i);
                    nfa.newaccepting.push(i);
                }
            });
        }

        for (let i = 0; i < nfa.states; i++) {
            if (nfa.edges[i] === undefined || nfa.edges[i]["0"] === undefined) continue;
            nfa.edges[i]["0"].forEach(val => {
                this.removeGitHubTransition(nfa, i, val, "0");
            });
        }

        return nfa;
    }

    static gitHubLClosure(nfa) {
        const closure = [];
        for (let i = nfa.states - 1; i >= 0; i--) {
            closure[i] = new Set([i]); // State can reach itself using only lambda transitions
            closure[i].forEach(val => {
                if (nfa.edges[val] !== undefined && nfa.edges[val]["0"] !== undefined) {
                    nfa.edges[val]["0"].forEach(val2 => {
                        if (val2 > i) {
                            closure[val2].forEach(val3 => {
                                closure[i].add(val3);
                            });
                        } else {
                            closure[i].add(val2);
                        }
                    });
                }
            });
        }
        return closure;
    }

    // Stage 5: Remove unreachable states (optimized implementation)
    static gitHubRemoveUnreachable(nfa, nfaOld) { // Remove unreachable states and their edges, and lower state numbers
        const reachable = new Set([nfa.start]); // Start state is reachable
        nfaOld.unreachable = [];

        reachable.forEach(val => {
            if (nfa.edges[val] === undefined) return;
            for (const symbol in nfa.edges[val]) {
                nfa.edges[val][symbol].forEach(val2 => {
                    reachable.add(val2);
                });
            }
        });

        for (let i = nfa.states - 1; i >= 0; i--) {
            if (!reachable.has(i)) {
                this.gitHubRemoveState(nfa, i);
                nfaOld.unreachable.push(i);
            }
        }

        return nfa;
    }

    // Deep copy automaton (optimized implementation)
    static gitHubDeepCopyAutomaton(fa) {
        const copy = {
            alphabet: new Set(fa.alphabet),         // Set containing letters used in expression
            states: fa.states,                      // Amount of states
            start: fa.start,                        // Index of starting state
            edges: [],                              // List of map of outgoing edges for each state
            outgoing: Array.from(fa.outgoing),      // Amount of outgoing edges for each state
            incoming: Array.from(fa.incoming),      // Amount of incoming edges for each state
            accepting: new Set(fa.accepting)        // Set of accepting states
        };

        for (let i = 0; i < fa.states; i++) {
            if (fa.edges[i] !== undefined) {
                copy.edges[i] = {};
                for (const symbol in fa.edges[i]) {
                    copy.edges[i][symbol] = new Set(fa.edges[i][symbol]);
                }
            }
        }

        return copy;
    }

    // Convert optimized NFA format to our NFA format
    static convertGitHubNFAToOurFormat(githubNFA, preserveLambdaTransitions = false) {
        console.log('🔄 Converting optimized NFA to our format...');
        console.log('Optimized NFA states:', githubNFA.states);
        console.log('Optimized NFA start:', githubNFA.start);
        console.log('Optimized NFA accepting:', [...githubNFA.accepting]);
        console.log('🔧 Preserve lambda transitions:', preserveLambdaTransitions);

        // Create states array with proper indexing
        const states = [];
        for (let i = 0; i < githubNFA.states; i++) {
            const state = new NFAState();
            state.name = `q${i}`;
            states[i] = state;
        }

        // Add transitions
        for (let i = 0; i < githubNFA.states; i++) {
            if (githubNFA.edges[i] !== undefined) {
                for (const symbol in githubNFA.edges[i]) {
                    if (symbol === "0") {
                        // Lambda/Epsilon transition
                        if (preserveLambdaTransitions) {
                            githubNFA.edges[i][symbol].forEach(target => {
                                if (target < githubNFA.states && states[target]) {
                                    states[i].addEpsilonTransition(states[target]);
                                }
                            });
                        }
                        // If not preserving lambda transitions, skip them
                    } else {
                        // Regular transition
                        githubNFA.edges[i][symbol].forEach(target => {
                            if (target < githubNFA.states && states[target]) {
                                states[i].addTransition(symbol, states[target]);
                            }
                        });
                    }
                }
            }
        }

        // Create NFA with proper start and accept states
        const startState = states[githubNFA.start];
        const acceptingStates = [...githubNFA.accepting];
        const acceptState = acceptingStates.length > 0 ? states[acceptingStates[0]] : startState;

        console.log('Start state:', startState?.name);
        console.log('Accept state:', acceptState?.name);

        const nfa = new NFA(startState, acceptState);
        nfa.states = states;

        console.log('Final NFA states:', nfa.states.map(s => s.name));

        return nfa;
    }

    // ===== ADVANCED PARSING METHODS =====

    // Stage 1: Parse regex into operation tree (optimized implementation)
    static parseRegexToTree(regex) {
        const stream = {
            string: regex,
            pos: 0,
            cur: function() { return this.string[this.pos]; },
            done: function() { return this.pos === this.string.length; }
        };

        try {
            const tree = this.parseExpr(stream);
            if (!stream.done()) {
                throw new Error("Non-empty stream");
            }
            return tree;
        } catch (err) {
            throw new Error(`Parse error: ${err}`);
        }
    }

    static parseExpr(stream) {
        const terms = [];
        while (!stream.done()) {
            terms.push(this.parseTerm(stream));
            if (!stream.done() && stream.cur() === '|') {
                stream.pos++;
            } else {
                break;
            }
        }

        if (terms.length === 0) {
            throw new Error("Empty expression");
        } else if (terms.length === 1) {
            return terms[0];
        } else {
            return { type: "or", value: terms };
        }
    }

    static parseTerm(stream) {
        const concats = [];
        while (!stream.done()) {
            const concat = this.parseConcat(stream);
            if (concat !== undefined) {
                if (Array.isArray(concat)) { // In case of +, count as 2 concats
                    concats.push(concat[0]);
                    concats.push(concat[1]);
                } else {
                    concats.push(concat);
                }
            } else {
                break;
            }
        }

        if (concats.length === 0) {
            throw new Error("Empty term");
        } else if (concats.length === 1) {
            return concats[0];
        } else {
            return { type: "concat", value: concats };
        }
    }

    static parseConcat(stream) {
        const atom = this.parseAtom(stream);
        if (atom !== undefined && !stream.done() && stream.cur() === "*") {
            stream.pos++;
            return { type: "star", value: atom };
        } else if (atom !== undefined && !stream.done() && stream.cur() === "+") {
            stream.pos++;
            return [ // At least 1, concat of atom and atom*
                atom,
                { type: "star", value: atom }
            ];
        } else {
            return atom;
        }
    }

    static parseAtom(stream) {
        if (stream.done()) {
            throw new Error("Missing atom");
        } else if (stream.cur().toUpperCase() !== stream.cur().toLowerCase()) { // Is letter
            stream.pos++;
            return { type: "letter", value: stream.string[stream.pos - 1] };
        } else if (stream.cur() === '0') {
            stream.pos++;
            return { type: "lambda", value: undefined };
        } else if (stream.cur() === '(') {
            stream.pos++;
            const expr = this.parseExpr(stream);
            if (!stream.done() && stream.cur() === ')') {
                stream.pos++;
                return expr;
            } else {
                throw new Error("Missing )");
            }
        } else {
            return undefined;
        }
    }

    // Stage 2: Construct NFAλ (NFA with lambda transitions) - optimized style
    static constructNFALambda(tree) {
        const nfa = {
            alphabet: new Set(),
            states: [],
            startState: null,
            acceptStates: new Set(),
            transitions: new Map(), // state -> symbol -> [states]
            epsilonTransitions: new Map() // state -> [states]
        };

        let stateCounter = 0;

        const buildNFA = (node) => {
            switch (node.type) {
                case "letter":
                    // Create basic NFA for single character
                    const start = new NFAState();
                    start.name = `q${stateCounter++}`;
                    const end = new NFAState();
                    end.name = `q${stateCounter++}`;

                    start.addTransition(node.value, end);
                    nfa.alphabet.add(node.value);

                    return {
                        startState: start,
                        acceptState: end,
                        states: [start, end]
                    };

                case "lambda":
                    // Create lambda NFA (single accepting state)
                    const lambdaState = new NFAState();
                    lambdaState.name = `q${stateCounter++}`;

                    return {
                        startState: lambdaState,
                        acceptState: lambdaState,
                        states: [lambdaState]
                    };

                case "or":
                    // Union operation - create new start and end states
                    const unionStart = new NFAState();
                    unionStart.name = `q${stateCounter++}`;
                    const unionEnd = new NFAState();
                    unionEnd.name = `q${stateCounter++}`;

                    const unionStates = [unionStart, unionEnd];

                    for (const term of node.value) {
                        const termNFA = buildNFA(term);
                        unionStates.push(...termNFA.states);

                        // Epsilon transitions from start to each term's start
                        unionStart.addEpsilonTransition(termNFA.startState);
                        // Epsilon transitions from each term's accept to end
                        termNFA.acceptState.addEpsilonTransition(unionEnd);
                    }

                    return {
                        startState: unionStart,
                        acceptState: unionEnd,
                        states: unionStates
                    };

                case "concat":
                    // Concatenation - connect NFAs with epsilon transitions
                    let concatStart = null;
                    let concatEnd = null;
                    let concatStates = [];

                    for (let i = 0; i < node.value.length; i++) {
                        const termNFA = buildNFA(node.value[i]);
                        concatStates.push(...termNFA.states);

                        if (i === 0) {
                            concatStart = termNFA.startState;
                        } else {
                            // Connect previous accept to current start with epsilon
                            concatEnd.addEpsilonTransition(termNFA.startState);
                        }

                        concatEnd = termNFA.acceptState;
                    }

                    return {
                        startState: concatStart,
                        acceptState: concatEnd,
                        states: concatStates
                    };

                case "star":
                    // Kleene star - create new start/end with epsilon transitions
                    const starNFA = buildNFA(node.value);
                    const starStart = new NFAState();
                    starStart.name = `q${stateCounter++}`;
                    const starEnd = new NFAState();
                    starEnd.name = `q${stateCounter++}`;

                    // Epsilon transitions for Kleene star
                    starStart.addEpsilonTransition(starNFA.startState); // Can enter
                    starStart.addEpsilonTransition(starEnd); // Can skip (zero times)
                    starNFA.acceptState.addEpsilonTransition(starNFA.startState); // Can repeat
                    starNFA.acceptState.addEpsilonTransition(starEnd); // Can exit

                    return {
                        startState: starStart,
                        acceptState: starEnd,
                        states: [starStart, starEnd, ...starNFA.states]
                    };

                default:
                    throw new Error(`Unknown node type: ${node.type}`);
            }
        };

        const result = buildNFA(tree);

        // Convert to our NFA format
        const finalNFA = new NFA(result.startState, result.acceptState);
        finalNFA.states = result.states;

        return finalNFA;
    }

    // Stage 3: Remove trivial states (key optimization)
    static removeTrivialStates(nfa) {
        console.log('🔧 Removing trivial states...');

        // Remove states with only 1 incoming or 1 outgoing lambda transition
        // This is the key optimization that reduces state count significantly

        let removed = true;
        while (removed) {
            removed = false;

            for (let i = nfa.states.length - 1; i >= 0; i--) {
                const state = nfa.states[i];

                // Skip start and accept states
                if (state === nfa.startState || state === nfa.acceptState) {
                    continue;
                }

                // Check for trivial outgoing epsilon transition
                if (state.epsilonTransitions.length === 1 &&
                    state.transitions.size === 0) {

                    const target = state.epsilonTransitions[0];
                    this.bypassState(nfa, state, target, 'outgoing');
                    removed = true;
                    continue;
                }

                // Check for trivial incoming epsilon transition
                const incomingEpsilon = this.getIncomingEpsilonTransitions(nfa, state);
                if (incomingEpsilon.length === 1 &&
                    state.transitions.size === 0 &&
                    state.epsilonTransitions.length === 0) {

                    const source = incomingEpsilon[0];
                    this.bypassState(nfa, state, source, 'incoming');
                    removed = true;
                    continue;
                }
            }
        }

        return nfa;
    }

    // Stage 4: Remove lambda transitions to get clean NFA
    static removeLambdaTransitions(nfa) {
        console.log('🧹 Removing lambda transitions...');

        // Calculate epsilon closure for each state
        const epsilonClosure = this.calculateEpsilonClosure(nfa);

        // Create new NFA without epsilon transitions
        const cleanNFA = new NFA(nfa.startState, nfa.acceptState);
        cleanNFA.states = [...nfa.states];

        // For each state, add direct transitions based on epsilon closure
        for (const state of nfa.states) {
            const closure = epsilonClosure.get(state);

            for (const closureState of closure) {
                // Copy all non-epsilon transitions from closure states
                for (const [symbol, targets] of closureState.transitions) {
                    for (const target of targets) {
                        state.addTransition(symbol, target);
                    }
                }

                // If closure contains accept state, make current state accepting
                if (closureState === nfa.acceptState && state !== nfa.acceptState) {
                    // Note: In our implementation, we only have one accept state
                    // So we'll handle this differently if needed
                }
            }
        }

        // Clear all epsilon transitions
        for (const state of cleanNFA.states) {
            state.epsilonTransitions = [];
        }

        return cleanNFA;
    }

    // Stage 5: Remove unreachable states
    static removeUnreachableStates(nfa) {
        console.log('🗑️ Removing unreachable states...');

        const reachable = new Set();
        const queue = [nfa.startState];
        reachable.add(nfa.startState);

        while (queue.length > 0) {
            const current = queue.shift();

            // Add all transition targets
            for (const [symbol, targets] of current.transitions) {
                for (const target of targets) {
                    if (!reachable.has(target)) {
                        reachable.add(target);
                        queue.push(target);
                    }
                }
            }

            // Add epsilon transition targets
            for (const target of current.epsilonTransitions) {
                if (!reachable.has(target)) {
                    reachable.add(target);
                    queue.push(target);
                }
            }
        }

        // Filter out unreachable states
        const reachableStates = nfa.states.filter(state => reachable.has(state));

        const finalNFA = new NFA(nfa.startState, nfa.acceptState);
        finalNFA.states = reachableStates;

        return finalNFA;
    }

    // Helper methods for GitHub pipeline
    static bypassState(nfa, stateToRemove, targetState, direction) {
        if (direction === 'outgoing') {
            // Redirect all incoming transitions to target
            for (const state of nfa.states) {
                // Redirect regular transitions
                for (const [symbol, targets] of state.transitions) {
                    if (targets.has(stateToRemove)) {
                        targets.delete(stateToRemove);
                        targets.add(targetState);
                    }
                }

                // Redirect epsilon transitions
                const epsilonIndex = state.epsilonTransitions.indexOf(stateToRemove);
                if (epsilonIndex !== -1) {
                    state.epsilonTransitions[epsilonIndex] = targetState;
                }
            }
        } else { // incoming
            // Redirect all outgoing transitions from source
            for (const [symbol, targets] of targetState.transitions) {
                for (const target of targets) {
                    stateToRemove.addTransition(symbol, target);
                }
            }

            for (const target of targetState.epsilonTransitions) {
                stateToRemove.addEpsilonTransition(target);
            }
        }

        // Remove the state
        const index = nfa.states.indexOf(stateToRemove);
        if (index !== -1) {
            nfa.states.splice(index, 1);
        }
    }

    static getIncomingEpsilonTransitions(nfa, targetState) {
        const incoming = [];
        for (const state of nfa.states) {
            if (state.epsilonTransitions.includes(targetState)) {
                incoming.push(state);
            }
        }
        return incoming;
    }

    static calculateEpsilonClosure(nfa) {
        const closures = new Map();

        for (const state of nfa.states) {
            const closure = new Set([state]);
            const queue = [state];

            while (queue.length > 0) {
                const current = queue.shift();

                for (const target of current.epsilonTransitions) {
                    if (!closure.has(target)) {
                        closure.add(target);
                        queue.push(target);
                    }
                }
            }

            closures.set(state, closure);
        }

        return closures;
    }

    // Fallback method for basic NFA creation
    static createBasicNFA(regex) {
        console.log('🔄 Creating basic NFA fallback for:', regex);

        // Simple fallback - create a basic 2-state NFA for single characters
        if (regex.length === 1 && regex.match(/[a-zA-Z]/)) {
            const start = new NFAState();
            start.name = 'q0';
            const end = new NFAState();
            end.name = 'q1';

            start.addTransition(regex, end);

            const nfa = new NFA(start, end);
            nfa.states = [start, end];
            return nfa;
        }

        // For more complex patterns, use simplified Thompson's construction
        try {
            const processedRegex = this.addConcatenation(regex);
            const postfix = this.infixToPostfix(processedRegex);
            return this.postfixToMinimalNFA(postfix);
        } catch (error) {
            console.error('Basic NFA creation failed:', error);
            // Return a simple accepting state as last resort
            const state = new NFAState();
            state.name = 'q0';
            const nfa = new NFA(state, state);
            nfa.states = [state];
            return nfa;
        }
    }

    // Try to create simple pattern NFA for common cases (fallback)
    static tryCreateSimplePatternNFA(regex) {
        console.log('🎯 Checking for simple pattern:', regex);

        // Handle very common simple patterns with minimal states
        if (regex === 'a*') {
            return this.createMinimalKleeneNFA('a');
        } else if (regex === 'b*') {
            return this.createMinimalKleeneNFA('b');
        } else if (regex === '(a|b)*') {
            return this.createMinimalAlternationKleeneNFA(['a', 'b']);
        } else if (regex === 'a*b*') {
            return this.createMinimalSequentialKleeneNFA(['a', 'b']);
        }

        return null; // No simple pattern match
    }

    // Rename states sequentially for clean visualization
    static renameStatesSequentially(nfa) {
        let counter = 0;
        const visited = new Set();

        // Rename states in order: start state first, then BFS
        const queue = [nfa.startState];
        visited.add(nfa.startState);
        nfa.startState.name = `q${counter++}`;

        while (queue.length > 0) {
            const current = queue.shift();

            // Visit all transition targets
            for (const [symbol, targets] of current.transitions) {
                for (const target of targets) {
                    if (!visited.has(target)) {
                        visited.add(target);
                        target.name = `q${counter++}`;
                        queue.push(target);
                    }
                }
            }

            // Visit epsilon transition targets
            for (const target of current.epsilonTransitions) {
                if (!visited.has(target)) {
                    visited.add(target);
                    target.name = `q${counter++}`;
                    queue.push(target);
                }
            }
        }
    }

    // Create minimal NFA for single Kleene star like "a*" (1 state)
    static createMinimalKleeneNFA(letter) {
        const state = new NFAState();
        state.name = `q0`;
        state.addTransition(letter, state); // Self-loop

        const nfa = new NFA(state, state); // Start and accept are the same state
        nfa.states = [state];
        return nfa;
    }

    // Create minimal NFA for alternation Kleene star like "(a|b)*" (1 state)
    static createMinimalAlternationKleeneNFA(letters) {
        const state = new NFAState();
        state.name = `q0`;

        // Add self-loop for each letter in the alternation
        for (const letter of letters) {
            state.addTransition(letter, state);
        }

        const nfa = new NFA(state, state); // Start and accept are the same state
        nfa.states = [state];
        return nfa;
    }

    // Create minimal NFA for sequential Kleene stars like "a*b*" (2 states)
    static createMinimalSequentialKleeneNFA(letters) {
        const q0 = new NFAState();
        q0.name = `q0`;
        const q1 = new NFAState();
        q1.name = `q1`;

        // Self-loops for each letter
        q0.addTransition(letters[0], q0); // a* at q0
        q1.addTransition(letters[1], q1); // b* at q1

        // Epsilon transition from q0 to q1
        q0.addEpsilonTransition(q1);

        const nfa = new NFA(q0, q1);
        nfa.states = [q0, q1];
        return nfa;
    }

    // Create minimal NFA for Kleene star with suffix like "(a|b)*abb" (4 states)
    static createMinimalKleeneWithSuffixNFA(kleeneLetters, suffix) {
        const states = [];

        // Create states: q0 for kleene + q1,q2,q3 for suffix "abb"
        for (let i = 0; i <= suffix.length; i++) {
            const state = new NFAState();
            state.name = `q${i}`;
            states.push(state);
        }

        // q0: self-loops for kleene letters
        for (const letter of kleeneLetters) {
            states[0].addTransition(letter, states[0]);
        }

        // Transitions for suffix "abb": q0-a->q1, q1-b->q2, q2-b->q3
        for (let i = 0; i < suffix.length; i++) {
            states[i].addTransition(suffix[i], states[i + 1]);
        }

        const nfa = new NFA(states[0], states[states.length - 1]);
        nfa.states = states;
        return nfa;
    }

    // Create minimal NFA for prefix with Kleene star like "a(a|b)*" (2 states)
    static createMinimalPrefixKleeneNFA(prefix, kleeneLetters) {
        const q0 = new NFAState();
        q0.name = `q0`;
        const q1 = new NFAState();
        q1.name = `q1`;

        // Transition for prefix: q0-a->q1
        q0.addTransition(prefix, q1);

        // Self-loops for kleene letters at q1
        for (const letter of kleeneLetters) {
            q1.addTransition(letter, q1);
        }

        const nfa = new NFA(q0, q1);
        nfa.states = [q0, q1];
        return nfa;
    }

    // Create minimal NFA for alternation plus like "(a|b)+" (2 states)
    static createMinimalAlternationPlusNFA(letters) {
        const q0 = new NFAState();
        q0.name = `q0`;
        const q1 = new NFAState();
        q1.name = `q1`;

        // Transitions from q0 to q1 for each letter
        for (const letter of letters) {
            q0.addTransition(letter, q1);
        }

        // Self-loops at q1 for each letter
        for (const letter of letters) {
            q1.addTransition(letter, q1);
        }

        const nfa = new NFA(q0, q1);
        nfa.states = [q0, q1];
        return nfa;
    }

    // Simplify regex patterns for better NFA generation
    static simplifyRegex(regex) {
        // Remove unnecessary parentheses and optimize patterns
        let simplified = regex;

        // Basic simplifications
        simplified = simplified.replace(/\(\(([^)]+)\)\)/g, '($1)'); // Remove double parentheses
        simplified = simplified.replace(/\(([a-zA-Z])\)/g, '$1'); // Remove single char parentheses

        return simplified;
    }

    // Create minimal Thompson NFA for complex patterns
    static createMinimalThompsonNFA(regex) {
        // For complex patterns, use a simplified approach
        // This is a fallback that tries to minimize states

        try {
            // Add concatenation operators where needed
            const processedRegex = this.addConcatenation(regex);
            console.log('Processed regex:', processedRegex);

            // Convert to postfix notation
            const postfix = this.infixToPostfix(processedRegex);
            console.log('Postfix:', postfix);

            // Build NFA from postfix with state minimization
            return this.postfixToMinimalNFA(postfix);

        } catch (error) {
            console.error('Error in createMinimalThompsonNFA:', error);
            throw error;
        }
    }

    // Add concatenation operators where needed
    static addConcatenation(regex) {
        let result = '';
        for (let i = 0; i < regex.length - 1; i++) {
            result += regex[i];
            if (regex[i] !== '(' && regex[i] !== '|' &&
                regex[i + 1] !== ')' && regex[i + 1] !== '*' &&
                regex[i + 1] !== '|' && regex[i + 1] !== '+') {
                result += '.';
            }
        }
        result += regex[regex.length - 1];
        return result;
    }

    // Add concatenation operators where needed
    static addConcatenation(regex) {
        let result = '';
        for (let i = 0; i < regex.length - 1; i++) {
            result += regex[i];
            if (regex[i] !== '(' && regex[i] !== '|' &&
                regex[i + 1] !== ')' && regex[i + 1] !== '*' &&
                regex[i + 1] !== '|' && regex[i + 1] !== '+') {
                result += '.';
            }
        }
        result += regex[regex.length - 1];
        return result;
    }

    // Convert infix to postfix notation
    static infixToPostfix(infix) {
        const precedence = { '|': 1, '.': 2, '*': 3, '+': 3 };
        const output = [];
        const operators = [];

        for (const char of infix) {
            if (char.match(/[a-zA-Z0-9]/)) {
                output.push(char);
            } else if (char === '(') {
                operators.push(char);
            } else if (char === ')') {
                while (operators.length > 0 && operators[operators.length - 1] !== '(') {
                    output.push(operators.pop());
                }
                operators.pop(); // Remove '('
            } else if (precedence[char]) {
                while (operators.length > 0 &&
                       operators[operators.length - 1] !== '(' &&
                       precedence[operators[operators.length - 1]] >= precedence[char]) {
                    output.push(operators.pop());
                }
                operators.push(char);
            }
        }

        while (operators.length > 0) {
            output.push(operators.pop());
        }

        return output.join('');
    }

    // Build truly minimal NFA from postfix notation (like GitHub reference)
    static postfixToTrulyMinimalNFA(postfix) {
        const stack = [];
        let stateCounter = 0;

        try {
            for (const char of postfix) {
                if (char.match(/[a-zA-Z0-9]/)) {
                    // Create basic NFA for single character
                    const start = new NFAState();
                    start.name = `q${stateCounter++}`;
                    const end = new NFAState();
                    end.name = `q${stateCounter++}`;

                    start.addTransition(char, end);

                    const nfa = new NFA(start, end);
                    nfa.states = [start, end];
                    stack.push(nfa);

                } else if (char === '.') {
                    // Concatenation - merge states to minimize
                    if (stack.length < 2) {
                        throw new Error('Invalid postfix expression: not enough operands for concatenation');
                    }

                    const nfa2 = stack.pop();
                    const nfa1 = stack.pop();

                    // Merge nfa1's accept state with nfa2's start state
                    this.mergeStates(nfa1.acceptState, nfa2.startState);

                    const nfa = new NFA(nfa1.startState, nfa2.acceptState);
                    nfa.states = [...nfa1.states.filter(s => s !== nfa1.acceptState), ...nfa2.states.filter(s => s !== nfa2.startState)];
                    stack.push(nfa);

                } else if (char === '|') {
                    // Union - try to minimize when possible
                    if (stack.length < 2) {
                        throw new Error('Invalid postfix expression: not enough operands for union');
                    }

                    const nfa2 = stack.pop();
                    const nfa1 = stack.pop();

                    // Check if we can create a single-state solution
                    if (this.canMergeForUnion(nfa1, nfa2)) {
                        const mergedNFA = this.createMergedUnionNFA(nfa1, nfa2, stateCounter);
                        stateCounter += mergedNFA.states.length;
                        stack.push(mergedNFA);
                    } else {
                        // Standard union with new start/end states
                        const start = new NFAState();
                        start.name = `q${stateCounter++}`;
                        const end = new NFAState();
                        end.name = `q${stateCounter++}`;

                        start.addEpsilonTransition(nfa1.startState);
                        start.addEpsilonTransition(nfa2.startState);
                        nfa1.acceptState.addEpsilonTransition(end);
                        nfa2.acceptState.addEpsilonTransition(end);

                        const nfa = new NFA(start, end);
                        nfa.states = [start, end, ...nfa1.states, ...nfa2.states];
                        stack.push(nfa);
                    }

                } else if (char === '*') {
                    // Kleene star - create minimal version when possible
                    if (stack.length < 1) {
                        throw new Error('Invalid postfix expression: not enough operands for Kleene star');
                    }

                    const nfa1 = stack.pop();

                    // For single character, create 1-state self-loop
                    if (nfa1.states.length === 2 && this.isSingleCharacterNFA(nfa1)) {
                        const singleState = new NFAState();
                        singleState.name = `q${stateCounter++}`;

                        // Find the character and create self-loop
                        for (const [symbol, targets] of nfa1.startState.transitions) {
                            singleState.addTransition(symbol, singleState);
                        }

                        const nfa = new NFA(singleState, singleState);
                        nfa.states = [singleState];
                        stack.push(nfa);
                    } else {
                        // Standard Kleene star for complex patterns
                        const start = new NFAState();
                        start.name = `q${stateCounter++}`;
                        const end = new NFAState();
                        end.name = `q${stateCounter++}`;

                        start.addEpsilonTransition(nfa1.startState);
                        start.addEpsilonTransition(end);
                        nfa1.acceptState.addEpsilonTransition(nfa1.startState);
                        nfa1.acceptState.addEpsilonTransition(end);

                        const nfa = new NFA(start, end);
                        nfa.states = [start, end, ...nfa1.states];
                        stack.push(nfa);
                    }

                } else if (char === '+') {
                    // Plus - create minimal version when possible
                    if (stack.length < 1) {
                        throw new Error('Invalid postfix expression: not enough operands for plus');
                    }

                    const nfa1 = stack.pop();

                    // For single character, create 2-state version
                    if (nfa1.states.length === 2 && this.isSingleCharacterNFA(nfa1)) {
                        const start = new NFAState();
                        start.name = `q${stateCounter++}`;
                        const end = new NFAState();
                        end.name = `q${stateCounter++}`;

                        // Find the character
                        for (const [symbol, targets] of nfa1.startState.transitions) {
                            start.addTransition(symbol, end);
                            end.addTransition(symbol, end);
                        }

                        const nfa = new NFA(start, end);
                        nfa.states = [start, end];
                        stack.push(nfa);
                    } else {
                        // Standard plus for complex patterns
                        const start = new NFAState();
                        start.name = `q${stateCounter++}`;
                        const end = new NFAState();
                        end.name = `q${stateCounter++}`;

                        start.addEpsilonTransition(nfa1.startState);
                        nfa1.acceptState.addEpsilonTransition(nfa1.startState);
                        nfa1.acceptState.addEpsilonTransition(end);

                        const nfa = new NFA(start, end);
                        nfa.states = [start, end, ...nfa1.states];
                        stack.push(nfa);
                    }

                } else {
                    console.warn('Unknown character in postfix:', char);
                }
            }

            if (stack.length !== 1) {
                throw new Error(`Invalid postfix expression: expected 1 result, got ${stack.length}`);
            }

            const result = stack[0];

            // Ensure states array is properly set
            if (!result.states || result.states.length === 0) {
                result.states = this.collectAllStates(result.startState);
            }

            return result;

        } catch (error) {
            console.error('Error in postfixToTrulyMinimalNFA:', error);
            throw error;
        }
    }

    // Check if NFA represents a single character transition
    static isSingleCharacterNFA(nfa) {
        return nfa.states.length === 2 &&
               nfa.startState.transitions.size === 1 &&
               nfa.startState.epsilonTransitions.length === 0 &&
               nfa.acceptState.transitions.size === 0 &&
               nfa.acceptState.epsilonTransitions.length === 0;
    }

    // Merge two states by copying all transitions
    static mergeStates(targetState, sourceState) {
        // Copy all transitions from source to target
        for (const [symbol, targets] of sourceState.transitions) {
            for (const target of targets) {
                targetState.addTransition(symbol, target);
            }
        }

        // Copy epsilon transitions
        for (const target of sourceState.epsilonTransitions) {
            targetState.addEpsilonTransition(target);
        }
    }

    // Check if two NFAs can be merged for union operation
    static canMergeForUnion(nfa1, nfa2) {
        // Simple heuristic: if both are single character NFAs with same structure
        return this.isSingleCharacterNFA(nfa1) && this.isSingleCharacterNFA(nfa2);
    }

    // Create merged NFA for union of two simple NFAs
    static createMergedUnionNFA(nfa1, nfa2, stateCounter) {
        const start = new NFAState();
        start.name = `q${stateCounter}`;
        const end = new NFAState();
        end.name = `q${stateCounter + 1}`;

        // Add transitions for both characters
        for (const [symbol, targets] of nfa1.startState.transitions) {
            start.addTransition(symbol, end);
        }
        for (const [symbol, targets] of nfa2.startState.transitions) {
            start.addTransition(symbol, end);
        }

        const nfa = new NFA(start, end);
        nfa.states = [start, end];
        return nfa;
    }

    // Build minimal NFA from postfix notation (robust and universal)
    static postfixToMinimalNFA(postfix) {
        // Fallback to truly minimal version
        return this.postfixToTrulyMinimalNFA(postfix);
    }

    // Collect all reachable states from start state
    static collectAllStates(startState) {
        const states = new Set();
        const queue = [startState];

        while (queue.length > 0) {
            const current = queue.shift();
            if (states.has(current)) continue;

            states.add(current);

            // Add transition targets
            for (const [symbol, targets] of current.transitions) {
                for (const target of targets) {
                    if (!states.has(target)) {
                        queue.push(target);
                    }
                }
            }

            // Add epsilon transition targets
            for (const target of current.epsilonTransitions) {
                if (!states.has(target)) {
                    queue.push(target);
                }
            }
        }

        return Array.from(states);
    }

    // Build NFA from postfix notation using Thompson's construction
    static postfixToNFA(postfix) {
        const stack = [];

        for (const char of postfix) {
            if (char.match(/[a-zA-Z0-9]/)) {
                // Create basic NFA for single character
                const start = new NFAState();
                start.name = `q${this.getNextStateId()}`;
                const end = new NFAState();
                end.name = `q${this.getNextStateId()}`;

                start.addTransition(char, end);

                const nfa = new NFA(start, end);
                nfa.states = [start, end];
                stack.push(nfa);

            } else if (char === '.') {
                // Concatenation
                const nfa2 = stack.pop();
                const nfa1 = stack.pop();

                // Connect nfa1's accept state to nfa2's start state with epsilon
                nfa1.acceptState.addEpsilonTransition(nfa2.startState);

                const nfa = new NFA(nfa1.startState, nfa2.acceptState);
                nfa.states = [...nfa1.states, ...nfa2.states];
                stack.push(nfa);

            } else if (char === '|') {
                // Union
                const nfa2 = stack.pop();
                const nfa1 = stack.pop();

                const start = new NFAState();
                start.name = `q${this.getNextStateId()}`;
                const end = new NFAState();
                end.name = `q${this.getNextStateId()}`;

                // Epsilon transitions from start to both NFAs
                start.addEpsilonTransition(nfa1.startState);
                start.addEpsilonTransition(nfa2.startState);

                // Epsilon transitions from both NFAs to end
                nfa1.acceptState.addEpsilonTransition(end);
                nfa2.acceptState.addEpsilonTransition(end);

                const nfa = new NFA(start, end);
                nfa.states = [start, end, ...nfa1.states, ...nfa2.states];
                stack.push(nfa);

            } else if (char === '*') {
                // Kleene star
                const nfa1 = stack.pop();

                const start = new NFAState();
                start.name = `q${this.getNextStateId()}`;
                const end = new NFAState();
                end.name = `q${this.getNextStateId()}`;

                // Epsilon transitions for Kleene star
                start.addEpsilonTransition(nfa1.startState);
                start.addEpsilonTransition(end);
                nfa1.acceptState.addEpsilonTransition(nfa1.startState);
                nfa1.acceptState.addEpsilonTransition(end);

                const nfa = new NFA(start, end);
                nfa.states = [start, end, ...nfa1.states];
                stack.push(nfa);

            } else if (char === '+') {
                // Plus (one or more)
                const nfa1 = stack.pop();

                const start = new NFAState();
                start.name = `q${this.getNextStateId()}`;
                const end = new NFAState();
                end.name = `q${this.getNextStateId()}`;

                // Epsilon transitions for plus
                start.addEpsilonTransition(nfa1.startState);
                nfa1.acceptState.addEpsilonTransition(nfa1.startState);
                nfa1.acceptState.addEpsilonTransition(end);

                const nfa = new NFA(start, end);
                nfa.states = [start, end, ...nfa1.states];
                stack.push(nfa);
            }
        }

        return stack[0];
    }

    // Helper method for state ID generation
    static getNextStateId() {
        if (!this.stateIdCounter) this.stateIdCounter = 0;
        return this.stateIdCounter++;
    }


}

// ===== OPTIMIZED DFA MINIMIZATION =====
// Based on advanced equivalence partitioning algorithm
class DFAMinimizer {
    static minimize(dfa) {
        console.log('🎯 Starting optimized DFA minimization...');
        const { states, alphabet, transitions, initialState, finalStates } = dfa;

        // Convert to optimized format
        const optimizedDFA = this.convertToOptimizedFormat(dfa);
        console.log('📊 Optimized DFA format:', optimizedDFA);

        // Apply optimized minimization algorithm
        const minimizedOptimizedDFA = this.optimizedMinimizeDFA(optimizedDFA);
        console.log('✨ Minimized optimized DFA:', minimizedOptimizedDFA);

        // Convert back to our format
        const result = this.convertFromOptimizedFormat(minimizedOptimizedDFA, states, alphabet, transitions, initialState, finalStates);
        console.log('🎉 Final minimized DFA:', result);

        return result;
    }

    // Convert our DFA format to optimized format
    static convertToOptimizedFormat(dfa) {
        const { states, alphabet, transitions, initialState, finalStates } = dfa;

        // Create state index mapping
        const stateArray = [...states];
        const stateToIndex = new Map();
        stateArray.forEach((state, index) => {
            stateToIndex.set(state, index);
        });

        const optimizedDFA = {
            alphabet: new Set(alphabet),
            states: stateArray.length,
            start: stateToIndex.get(initialState),
            edges: [],
            outgoing: [],
            incoming: [],
            accepting: new Set()
        };

        // Set accepting states
        finalStates.forEach(state => {
            optimizedDFA.accepting.add(stateToIndex.get(state));
        });

        // Initialize edges and counters
        for (let i = 0; i < optimizedDFA.states; i++) {
            optimizedDFA.edges[i] = {};
            optimizedDFA.outgoing[i] = 0;
            optimizedDFA.incoming[i] = 0;
        }

        // Add transitions
        for (const symbol of alphabet) {
            for (const state of states) {
                const fromIndex = stateToIndex.get(state);
                const targetState = transitions[`${state},${symbol}`];
                const toIndex = stateToIndex.get(targetState);

                if (toIndex !== undefined) {
                    this.addOptimizedTransition(optimizedDFA, fromIndex, toIndex, symbol);
                }
            }
        }

        return { optimizedDFA, stateArray, stateToIndex };
    }

    // Optimized minimization algorithm (based on advanced equivalence checking)
    static optimizedMinimizeDFA(data) {
        const { optimizedDFA } = data;
        const DFA = optimizedDFA;

        // 2D array of booleans indicating if state i and j are equivalent
        const equivalent = [];
        for (let i = 0; i < DFA.states; i++) {
            equivalent[i] = [];
            for (let j = i; j < DFA.states; j++) {
                // Start by marking states equivalent if they are both accepting or non-accepting
                if ((DFA.accepting.has(i) && DFA.accepting.has(j)) ||
                    (!DFA.accepting.has(i) && !DFA.accepting.has(j))) {
                    equivalent[i][j] = true;
                } else {
                    equivalent[i][j] = false;
                }
            }
        }

        // Continue marking rounds until we have a round where nothing is marked
        while (true) {
            let marked = false; // Have we marked something this round?
            for (let i = 0; i < DFA.states; i++) {
                for (let j = i + 1; j < DFA.states; j++) {
                    if (equivalent[i][j]) {
                        for (const symbol of DFA.alphabet) {
                            if (!equivalent[i][j]) break;

                            const a = DFA.edges[i][symbol] ? [...DFA.edges[i][symbol]][0] : undefined;
                            const b = DFA.edges[j][symbol] ? [...DFA.edges[j][symbol]][0] : undefined;

                            if (a !== undefined && b !== undefined) {
                                const minAB = Math.min(a, b);
                                const maxAB = Math.max(a, b);
                                if (!equivalent[minAB][maxAB]) {
                                    equivalent[i][j] = false;
                                    marked = true;
                                }
                            }
                        }
                    }
                }
            }
            if (!marked) break; // Nothing marked this round, stop
        }

        // Build minimized DFA
        const DFAm = {
            alphabet: new Set(DFA.alphabet),
            states: 0,
            edges: [],
            outgoing: [],
            incoming: [],
            accepting: new Set(),
            statescor: []
        };

        const taken = [];
        for (let i = 0; i < DFA.states; i++) {
            if (taken.includes(i)) continue; // State already got assigned to a new state

            if (DFA.accepting.has(i)) { // New state is accepting iff old states were accepting
                DFAm.accepting.add(DFAm.states);
            }

            DFAm.statescor[DFAm.states] = [];
            for (let j = i; j < DFA.states; j++) {
                if (equivalent[i][j]) {
                    DFAm.statescor[DFAm.states].push(j);
                    taken.push(j);
                }
            }

            if (DFAm.statescor[DFAm.states].includes(DFA.start)) {
                DFAm.start = DFAm.states; // New starting state corresponds to old starting state
            }
            DFAm.states++;
        }

        // Initialize edges arrays
        for (let i = 0; i < DFAm.states; i++) {
            DFAm.edges[i] = {};
            DFAm.outgoing[i] = 0;
            DFAm.incoming[i] = 0;
        }

        // Add the new transitions
        for (let i = 0; i < DFAm.states; i++) {
            for (const symbol of DFAm.alphabet) {
                const toOld = DFA.edges[DFAm.statescor[i][0]][symbol] ?
                    [...DFA.edges[DFAm.statescor[i][0]][symbol]][0] : undefined;

                if (toOld !== undefined) {
                    let toNew;
                    for (let j = 0; j < DFAm.states; j++) {
                        if (DFAm.statescor[j].includes(toOld)) {
                            toNew = j;
                            break;
                        }
                    }
                    this.addOptimizedTransition(DFAm, i, toNew, symbol);
                }
            }
        }

        return { ...data, minimizedDFA: DFAm };
    }

    // Convert optimized format back to our format
    static convertFromOptimizedFormat(data, originalStates, originalAlphabet, originalTransitions, originalInitialState, originalFinalStates) {
        const { minimizedDFA, stateArray } = data;
        const DFAm = minimizedDFA;

        // Create state mapping
        const stateMapping = new Map();
        const newStates = new Set();
        const newTransitions = {};
        const newFinalStates = new Set();

        // Map old states to new states
        for (let i = 0; i < DFAm.states; i++) {
            const newStateName = `S${i}`;
            newStates.add(newStateName);

            // Map all original states in this partition to the new state
            for (const oldStateIndex of DFAm.statescor[i]) {
                const oldStateName = stateArray[oldStateIndex];
                stateMapping.set(oldStateName, newStateName);
            }

            // Check if this is a final state
            if (DFAm.accepting.has(i)) {
                newFinalStates.add(newStateName);
            }
        }

        // Find new initial state
        const newInitialState = stateMapping.get(originalInitialState);

        // Create new transitions
        for (let i = 0; i < DFAm.states; i++) {
            const fromState = `S${i}`;
            for (const symbol of originalAlphabet) {
                if (DFAm.edges[i][symbol]) {
                    const toIndex = [...DFAm.edges[i][symbol]][0];
                    const toState = `S${toIndex}`;
                    newTransitions[`${fromState},${symbol}`] = toState;
                }
            }
        }

        return {
            states: newStates,
            alphabet: new Set(originalAlphabet),
            transitions: newTransitions,
            initialState: newInitialState,
            finalStates: newFinalStates,
            stateMapping: stateMapping
        };
    }

    // Helper method to add transitions in optimized format
    static addOptimizedTransition(fa, from, to, symbol) {
        if (fa.edges[from] === undefined) {
            fa.edges[from] = {};
        }
        if (fa.edges[from][symbol] === undefined) {
            fa.edges[from][symbol] = new Set([to]);
        } else {
            if (fa.edges[from][symbol].has(to)) {
                return false; // Transition already exists
            }
            fa.edges[from][symbol].add(to);
        }
        if (fa.outgoing[from] === undefined) {
            fa.outgoing[from] = 1;
        } else {
            fa.outgoing[from]++;
        }
        if (fa.incoming[to] === undefined) {
            fa.incoming[to] = 1;
        } else {
            fa.incoming[to]++;
        }
        return true;
    }
}

// ===== DFA EQUIVALENCE CHECKER =====
class DFAEquivalenceChecker {
    static areEquivalent(dfa1, dfa2) {
        // Make both DFAs total (add dead state if needed)
        const totalDFA1 = this.makeTotalDFA(dfa1);
        const totalDFA2 = this.makeTotalDFA(dfa2);

        const visited = new Set();
        const queue = [[totalDFA1.initialState, totalDFA2.initialState]];

        while (queue.length > 0) {
            const [state1, state2] = queue.shift();
            const pairKey = `${state1},${state2}`;

            if (visited.has(pairKey)) continue;
            visited.add(pairKey);

            // Check if one is final and the other is not
            const isFinal1 = totalDFA1.finalStates.has(state1);
            const isFinal2 = totalDFA2.finalStates.has(state2);

            if (isFinal1 !== isFinal2) {
                return false;
            }

            // Check transitions for all symbols in combined alphabet
            const combinedAlphabet = new Set([...totalDFA1.alphabet, ...totalDFA2.alphabet]);

            for (const symbol of combinedAlphabet) {
                const next1 = totalDFA1.transitions[`${state1},${symbol}`];
                const next2 = totalDFA2.transitions[`${state2},${symbol}`];

                if (next1 && next2) {
                    queue.push([next1, next2]);
                }
            }
        }

        return true;
    }

    static areEquivalentWithAnalysis(dfa1, dfa2) {
        // Make both DFAs total (add dead state if needed)
        const totalDFA1 = this.makeTotalDFA(dfa1);
        const totalDFA2 = this.makeTotalDFA(dfa2);

        const visited = new Set();
        const queue = [[totalDFA1.initialState, totalDFA2.initialState]];
        const stateCorrespondence = new Map();
        const visitedPairs = [];
        let differenceFound = null;

        while (queue.length > 0) {
            const [state1, state2] = queue.shift();
            const pairKey = `${state1},${state2}`;

            if (visited.has(pairKey)) continue;
            visited.add(pairKey);
            visitedPairs.push([state1, state2]);

            // Record state correspondence
            if (!stateCorrespondence.has(state1)) {
                stateCorrespondence.set(state1, []);
            }
            stateCorrespondence.get(state1).push(state2);

            // Check if one is final and the other is not
            const isFinal1 = totalDFA1.finalStates.has(state1);
            const isFinal2 = totalDFA2.finalStates.has(state2);

            if (isFinal1 !== isFinal2) {
                differenceFound = {
                    type: 'finality',
                    state1: state1,
                    state2: state2,
                    isFinal1: isFinal1,
                    isFinal2: isFinal2
                };
                break;
            }

            // Check transitions for all symbols in combined alphabet
            const combinedAlphabet = new Set([...totalDFA1.alphabet, ...totalDFA2.alphabet]);

            for (const symbol of combinedAlphabet) {
                const next1 = totalDFA1.transitions[`${state1},${symbol}`];
                const next2 = totalDFA2.transitions[`${state2},${symbol}`];

                if (next1 && next2) {
                    queue.push([next1, next2]);
                } else if (next1 !== next2) {
                    differenceFound = {
                        type: 'transition',
                        state1: state1,
                        state2: state2,
                        symbol: symbol,
                        next1: next1,
                        next2: next2
                    };
                    break;
                }
            }

            if (differenceFound) break;
        }

        const equivalent = !differenceFound;

        return {
            equivalent: equivalent,
            analysis: {
                totalDFA1: totalDFA1,
                totalDFA2: totalDFA2,
                stateCorrespondence: stateCorrespondence,
                visitedPairs: visitedPairs,
                differenceFound: differenceFound,
                combinedAlphabet: new Set([...totalDFA1.alphabet, ...totalDFA2.alphabet])
            }
        };
    }

    static makeTotalDFA(dfa) {
        const { states, alphabet, transitions, initialState, finalStates } = dfa;
        const newStates = new Set([...states]);
        const newTransitions = { ...transitions };

        // Check if we need a dead state
        let needDeadState = false;
        const deadState = 'DEAD';

        for (const state of states) {
            for (const symbol of alphabet) {
                if (!transitions[`${state},${symbol}`]) {
                    needDeadState = true;
                    break;
                }
            }
            if (needDeadState) break;
        }

        if (needDeadState) {
            newStates.add(deadState);

            // Add missing transitions to dead state
            for (const state of states) {
                for (const symbol of alphabet) {
                    if (!transitions[`${state},${symbol}`]) {
                        newTransitions[`${state},${symbol}`] = deadState;
                    }
                }
            }

            // Add dead state self-loops
            for (const symbol of alphabet) {
                newTransitions[`${deadState},${symbol}`] = deadState;
            }
        }

        return {
            states: newStates,
            alphabet,
            transitions: newTransitions,
            initialState,
            finalStates
        };
    }
}

// ===== IMPROVED VISUALIZATION WITH ZOOM =====
class AutomataVisualizer {
    constructor(containerId) {
        this.container = d3.select(`#${containerId}`);
        this.width = 800;
        this.height = 500;
        this.nodeRadius = 30;
        this.svg = null;
        this.simulation = null;
        this.g = null; // Group for zoomable content
        this.zoom = null;
    }

    clear() {
        this.container.selectAll('*').remove();
    }

    visualizeDFA(dfa, currentState = null, currentTransition = null) {
        this.clear();

        const nodes = [];
        const links = [];

        // Create nodes with better positioning
        const stateArray = Array.from(dfa.states);
        stateArray.forEach((state, index) => {
            const angle = (2 * Math.PI * index) / stateArray.length;
            const radius = Math.min(this.width, this.height) * 0.25;
            nodes.push({
                id: state,
                label: state,
                isInitial: state === dfa.initialState,
                isFinal: dfa.finalStates.has(state),
                isCurrent: state === currentState,
                x: this.width / 2 + radius * Math.cos(angle),
                y: this.height / 2 + radius * Math.sin(angle),
                fx: null,
                fy: null
            });
        });

        // Create links with better organization
        const transitions = dfa.getTransitions();
        const linkGroups = new Map();

        // Group transitions by source-target pair
        transitions.forEach(transition => {
            const key = `${transition.from}-${transition.to}`;
            const reverseKey = `${transition.to}-${transition.from}`;

            if (!linkGroups.has(key)) {
                linkGroups.set(key, {
                    source: transition.from,
                    target: transition.to,
                    labels: [],
                    isReverse: linkGroups.has(reverseKey)
                });
            }
            linkGroups.get(key).labels.push(transition.symbol);
        });

        // Convert to links array
        linkGroups.forEach((linkData, key) => {
            const link = {
                source: linkData.source,
                target: linkData.target,
                label: linkData.labels.join(', '),
                isCurrent: currentTransition &&
                          currentTransition.from === linkData.source &&
                          currentTransition.to === linkData.target,
                isReverse: linkData.isReverse,
                isSelfLoop: linkData.source === linkData.target
            };
            links.push(link);
        });

        this.renderImprovedGraph(nodes, links);
    }

    visualizeNFA(nfa) {
        this.clear();

        const nodes = [];
        const links = [];

        // Create nodes for NFA
        nfa.states.forEach((state, index) => {
            const angle = (2 * Math.PI * index) / nfa.states.length;
            const radius = Math.min(this.width, this.height) * 0.3;
            nodes.push({
                id: state.name,
                label: state.name,
                isInitial: state === nfa.startState,
                isFinal: state === nfa.acceptState,
                isCurrent: false,
                x: this.width / 2 + radius * Math.cos(angle),
                y: this.height / 2 + radius * Math.sin(angle),
                fx: null,
                fy: null
            });
        });

        // Create links for NFA with improved transition handling
        const transitions = nfa.getTransitions();
        const linkGroups = new Map();

        transitions.forEach(transition => {
            const key = `${transition.from}-${transition.to}`;
            const reverseKey = `${transition.to}-${transition.from}`;

            if (!linkGroups.has(key)) {
                linkGroups.set(key, {
                    source: transition.from,
                    target: transition.to,
                    labels: [],
                    isReverse: linkGroups.has(reverseKey)
                });
            }

            // Handle epsilon transitions properly
            const symbol = transition.symbol === '' ? 'ε' : transition.symbol;
            linkGroups.get(key).labels.push(symbol);
        });

        // Convert to links array with proper formatting
        linkGroups.forEach((linkData, key) => {
            const link = {
                source: linkData.source,
                target: linkData.target,
                label: linkData.labels.join(', '),
                isCurrent: false,
                isReverse: linkData.isReverse,
                isSelfLoop: linkData.source === linkData.target,
                isLambda: linkData.labels.some(label => label === 'ε' || label === 'λ')
            };
            links.push(link);
        });

        this.renderImprovedGraph(nodes, links);
    }

    renderImprovedGraph(nodes, links) {
        // Create SVG with better setup
        this.svg = this.container.append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .style('background', '#fafafa')
            .style('border', '1px solid #e2e8f0')
            .style('border-radius', '8px')
            .style('cursor', 'grab');

        // Define improved markers
        const defs = this.svg.append('defs');

        // Arrow marker
        defs.append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 15)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#4a5568')
            .attr('stroke', '#4a5568');

        // Current arrow marker
        defs.append('marker')
            .attr('id', 'arrow-current')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 15)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#f59e0b')
            .attr('stroke', '#f59e0b');

        // Create main group for zoomable content
        this.g = this.svg.append('g')
            .attr('class', 'zoomable-content');

        // Setup zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });

        // Apply zoom to SVG
        this.svg.call(this.zoom);

        // Add zoom controls
        this.addZoomControls();

        // Create simulation with improved forces
        this.simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(120).strength(0.1))
            .force('charge', d3.forceManyBody().strength(-800))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(this.nodeRadius + 15))
            .alphaDecay(0.02)
            .velocityDecay(0.8);

        // Create link groups for better organization
        const linkGroup = this.g.append('g').attr('class', 'links');
        const nodeGroup = this.g.append('g').attr('class', 'nodes');
        const labelGroup = this.g.append('g').attr('class', 'labels');

        // Create improved links
        const linkPaths = linkGroup.selectAll('path')
            .data(links)
            .enter().append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', d => {
                if (d.isCurrent) return '#f59e0b';
                if (d.isLambda) return '#ff6b35';
                return '#64748b';
            })
            .attr('stroke-width', d => d.isCurrent ? 3 : 2)
            .attr('stroke-dasharray', d => d.isLambda ? '5,5' : 'none')
            .attr('marker-end', d => d.isCurrent ? 'url(#arrow-current)' : 'url(#arrow)')
            .attr('opacity', 0.8);

        // Create improved link labels with background
        const linkLabels = labelGroup.selectAll('g.link-label')
            .data(links)
            .enter().append('g')
            .attr('class', 'link-label');

        // Add background rectangles for labels
        linkLabels.append('rect')
            .attr('fill', 'white')
            .attr('stroke', '#e2e8f0')
            .attr('stroke-width', 1)
            .attr('rx', 3)
            .attr('ry', 3);

        // Add text labels
        linkLabels.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '13px')
            .attr('font-weight', '600')
            .attr('fill', d => d.isLambda ? '#ff6b35' : '#1a202c')
            .attr('font-style', d => d.isLambda ? 'italic' : 'normal')
            .text(d => d.label);

        // Create improved nodes
        const nodeElements = nodeGroup.selectAll('g')
            .data(nodes)
            .enter().append('g')
            .attr('class', 'node')
            .style('cursor', 'grab')
            .call(d3.drag()
                .on('start', (event, d) => this.dragStarted(event, d))
                .on('drag', (event, d) => this.dragged(event, d))
                .on('end', (event, d) => this.dragEnded(event, d)));

        // Add outer circle for final states
        nodeElements.filter(d => d.isFinal)
            .append('circle')
            .attr('r', this.nodeRadius + 4)
            .attr('fill', 'none')
            .attr('stroke', d => d.isCurrent ? '#f59e0b' : '#2563eb')
            .attr('stroke-width', 2);

        // Add main circles
        nodeElements.append('circle')
            .attr('r', this.nodeRadius)
            .attr('fill', d => {
                if (d.isCurrent) return '#fef3c7';
                if (d.isInitial) return '#dbeafe';
                return 'white';
            })
            .attr('stroke', d => d.isCurrent ? '#f59e0b' : '#2563eb')
            .attr('stroke-width', d => d.isCurrent ? 3 : 2)
            .attr('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))');

        // Add state labels
        nodeElements.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', '600')
            .attr('fill', '#1a202c')
            .text(d => d.label)
            .style('pointer-events', 'none');

        // Add initial state indicator
        const initialNode = nodes.find(n => n.isInitial);
        if (initialNode) {
            this.g.append('g').attr('class', 'start-indicator')
                .append('path')
                .attr('d', 'M50,50 L100,50')
                .attr('stroke', '#2563eb')
                .attr('stroke-width', 2)
                .attr('marker-end', 'url(#arrow)');

            this.g.select('.start-indicator')
                .append('text')
                .attr('x', 25)
                .attr('y', 45)
                .attr('text-anchor', 'middle')
                .attr('font-size', '12px')
                .attr('font-weight', '500')
                .attr('fill', '#64748b')
                .text('start');
        }

        // Update positions on tick with improved calculations
        this.simulation.on('tick', () => {
            // Update link paths
            linkPaths.attr('d', d => this.calculatePath(d));

            // Update link labels
            linkLabels.attr('transform', d => {
                const midpoint = this.getPathMidpoint(d);
                return `translate(${midpoint.x}, ${midpoint.y})`;
            });

            // Update text background rectangles
            linkLabels.select('rect').each(function(d) {
                const textElement = d3.select(this.parentNode).select('text');
                const bbox = textElement.node().getBBox();
                d3.select(this)
                    .attr('x', bbox.x - 2)
                    .attr('y', bbox.y - 1)
                    .attr('width', bbox.width + 4)
                    .attr('height', bbox.height + 2);
            });

            // Update nodes
            nodeElements.attr('transform', d => `translate(${d.x}, ${d.y})`);

            // Update start indicator
            if (initialNode) {
                const startX = initialNode.x - this.nodeRadius - 30;
                const startY = initialNode.y;
                this.g.select('.start-indicator path')
                    .attr('d', `M${startX},${startY} L${initialNode.x - this.nodeRadius - 5},${startY}`);
                this.g.select('.start-indicator text')
                    .attr('x', startX - 25)
                    .attr('y', startY - 5);
            }
        });
    }

    addZoomControls() {
        // Create zoom control container
        const controls = this.svg.append('g')
            .attr('class', 'zoom-controls')
            .attr('transform', `translate(${this.width - 120}, 20)`);

        // Zoom in button
        const zoomInBtn = controls.append('g')
            .attr('class', 'zoom-btn')
            .style('cursor', 'pointer');

        zoomInBtn.append('rect')
            .attr('width', 30)
            .attr('height', 30)
            .attr('rx', 4)
            .attr('fill', '#2563eb')
            .attr('stroke', '#1d4ed8')
            .attr('stroke-width', 1);

        zoomInBtn.append('text')
            .attr('x', 15)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .text('+');

        zoomInBtn.on('click', () => {
            this.svg.transition().duration(300).call(
                this.zoom.scaleBy, 1.5
            );
        });

        // Zoom out button
        const zoomOutBtn = controls.append('g')
            .attr('class', 'zoom-btn')
            .attr('transform', 'translate(35, 0)')
            .style('cursor', 'pointer');

        zoomOutBtn.append('rect')
            .attr('width', 30)
            .attr('height', 30)
            .attr('rx', 4)
            .attr('fill', '#2563eb')
            .attr('stroke', '#1d4ed8')
            .attr('stroke-width', 1);

        zoomOutBtn.append('text')
            .attr('x', 15)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .text('-');

        zoomOutBtn.on('click', () => {
            this.svg.transition().duration(300).call(
                this.zoom.scaleBy, 0.67
            );
        });

        // Reset zoom button
        const resetBtn = controls.append('g')
            .attr('class', 'zoom-btn')
            .attr('transform', 'translate(70, 0)')
            .style('cursor', 'pointer');

        resetBtn.append('rect')
            .attr('width', 30)
            .attr('height', 30)
            .attr('rx', 4)
            .attr('fill', '#64748b')
            .attr('stroke', '#475569')
            .attr('stroke-width', 1);

        resetBtn.append('text')
            .attr('x', 15)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text('⌂');

        resetBtn.on('click', () => {
            this.svg.transition().duration(500).call(
                this.zoom.transform,
                d3.zoomIdentity
            );
        });
    }

    calculatePath(d) {
        const sourceX = d.source.x;
        const sourceY = d.source.y;
        const targetX = d.target.x;
        const targetY = d.target.y;

        // Handle self-loops with proper circular shape
        if (d.isSelfLoop) {
            const loopRadius = 25;
            const startAngle = -Math.PI / 2; // Start from top

            // Calculate start and end points on the circle edge
            const startX = sourceX + this.nodeRadius * Math.cos(startAngle);
            const startY = sourceY + this.nodeRadius * Math.sin(startAngle);

            // Create circular arc above the node
            const controlX1 = sourceX - loopRadius;
            const controlY1 = sourceY - loopRadius - this.nodeRadius;
            const controlX2 = sourceX + loopRadius;
            const controlY2 = sourceY - loopRadius - this.nodeRadius;

            const endX = sourceX + this.nodeRadius * Math.cos(startAngle + 0.1);
            const endY = sourceY + this.nodeRadius * Math.sin(startAngle + 0.1);

            // Create a smooth circular path
            return `M ${startX} ${startY}
                    C ${controlX1} ${controlY1}
                    ${controlX1} ${controlY2}
                    ${sourceX} ${sourceY - loopRadius - this.nodeRadius}
                    C ${controlX2} ${controlY2}
                    ${controlX2} ${controlY1}
                    ${endX} ${endY}`;
        }

        // Calculate angle and adjust for node radius
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const angle = Math.atan2(dy, dx);

        const sourceRadius = this.nodeRadius + 2;
        const targetRadius = this.nodeRadius + 2;

        const adjustedSourceX = sourceX + sourceRadius * Math.cos(angle);
        const adjustedSourceY = sourceY + sourceRadius * Math.sin(angle);
        const adjustedTargetX = targetX - targetRadius * Math.cos(angle);
        const adjustedTargetY = targetY - targetRadius * Math.sin(angle);

        // Create curved path for better visibility
        const midX = (adjustedSourceX + adjustedTargetX) / 2;
        const midY = (adjustedSourceY + adjustedTargetY) / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const curvature = Math.min(distance * 0.2, 30);

        const perpAngle = angle + Math.PI / 2;
        const controlX = midX + curvature * Math.cos(perpAngle);
        const controlY = midY + curvature * Math.sin(perpAngle);

        return `M ${adjustedSourceX} ${adjustedSourceY}
                Q ${controlX} ${controlY}
                ${adjustedTargetX} ${adjustedTargetY}`;
    }

    getPathMidpoint(d) {
        if (d.isSelfLoop) {
            return {
                x: d.source.x,
                y: d.source.y - this.nodeRadius - 30 // Position label above the circular loop
            };
        }

        const sourceX = d.source.x;
        const sourceY = d.source.y;
        const targetX = d.target.x;
        const targetY = d.target.y;

        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const angle = Math.atan2(dy, dx);

        const midX = (sourceX + targetX) / 2;
        const midY = (sourceY + targetY) / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const curvature = Math.min(distance * 0.2, 30);

        const perpAngle = angle + Math.PI / 2;
        return {
            x: midX + curvature * 0.5 * Math.cos(perpAngle),
            y: midY + curvature * 0.5 * Math.sin(perpAngle)
        };
    }

    dragStarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.1).restart();
        d.fx = d.x;
        d.fy = d.y;
        d3.select(event.sourceEvent.target.parentNode).style('cursor', 'grabbing');
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragEnded(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        // Keep the node fixed at the dragged position
        d.fx = event.x;
        d.fy = event.y;
        d3.select(event.sourceEvent.target.parentNode).style('cursor', 'grab');
    }

    centerGraph() {
        if (this.simulation) {
            // Reset all fixed positions
            this.simulation.nodes().forEach(node => {
                node.fx = null;
                node.fy = null;
            });
            this.simulation.alpha(0.3).restart();

            // Reset zoom to default
            if (this.zoom) {
                this.svg.transition().duration(500).call(
                    this.zoom.transform,
                    d3.zoomIdentity
                );
            }
        }
    }
}

// ===== INITIALIZE APPLICATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeTabSystem();
    initializeDFASimulator();
    initializeRegexToNFA();
    initializeDFAMinimization();
    initializeDFAEquivalence();
});

// ===== TAB SYSTEM =====
function initializeTabSystem() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// ===== DFA SIMULATOR =====
function initializeDFASimulator() {
    const statesInput = document.getElementById('dfa-states');
    const alphabetInput = document.getElementById('dfa-alphabet');
    const initialSelect = document.getElementById('dfa-initial');
    const finalInput = document.getElementById('dfa-final');
    const buildButton = document.getElementById('build-dfa');
    const clearButton = document.getElementById('clear-dfa');
    const testButton = document.getElementById('test-string-btn');
    const testInput = document.getElementById('test-string');
    const centerButton = document.getElementById('center-graph');
    const exampleButtons = document.querySelectorAll('[data-example]');

    const visualizer = new AutomataVisualizer('dfa-visualization');

    // DFA Example configurations
    const dfaExamples = {
        'ending-01': {
            states: 'q0,q1,q2',
            alphabet: '0,1',
            initial: 'q0',
            final: 'q2',
            transitions: {
                'q0,0': 'q1',
                'q0,1': 'q0',
                'q1,0': 'q1',
                'q1,1': 'q2',
                'q2,0': 'q1',
                'q2,1': 'q0'
            },
            description: 'Accepts binary strings ending with "01"'
        },
        'even-zeros': {
            states: 'even,odd',
            alphabet: '0,1',
            initial: 'even',
            final: 'even',
            transitions: {
                'even,0': 'odd',
                'even,1': 'even',
                'odd,0': 'even',
                'odd,1': 'odd'
            },
            description: 'Accepts strings with even number of 0s'
        },
        'multiple-of-3': {
            states: 'r0,r1,r2',
            alphabet: '0,1',
            initial: 'r0',
            final: 'r0',
            transitions: {
                'r0,0': 'r0',
                'r0,1': 'r1',
                'r1,0': 'r2',
                'r1,1': 'r0',
                'r2,0': 'r1',
                'r2,1': 'r2'
            },
            description: 'Accepts binary numbers that are multiples of 3'
        },
        'with-loops': {
            states: 'q0,q1,q2',
            alphabet: 'a,b',
            initial: 'q0',
            final: 'q2',
            transitions: {
                'q0,a': 'q1',
                'q0,b': 'q0',
                'q1,a': 'q1',
                'q1,b': 'q2',
                'q2,a': 'q0',
                'q2,b': 'q2'
            },
            description: 'DFA with self-loops to demonstrate circular arrows'
        }
    };

    // Example button handlers
    exampleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const exampleKey = button.getAttribute('data-example');
            const example = dfaExamples[exampleKey];

            if (example) {
                statesInput.value = example.states;
                alphabetInput.value = example.alphabet;
                finalInput.value = example.final;

                updateTransitionTable();

                setTimeout(() => {
                    initialSelect.value = example.initial;

                    const table = document.querySelector('#transition-table table');
                    if (table) {
                        const inputs = table.querySelectorAll('input');
                        inputs.forEach(input => {
                            const key = input.dataset.transition;
                            if (example.transitions[key]) {
                                input.value = example.transitions[key];
                            }
                        });
                    }

                    // Show description
                    showResult('test-result', true, 'Example loaded successfully!', example.description);
                }, 100);
            }
        });
    });

    // Update transition table when states or alphabet change
    function updateTransitionTable() {
        const states = parseInput(statesInput.value);
        const alphabet = parseInput(alphabetInput.value);

        updateInitialStateSelect(states, initialSelect);
        generateTransitionTable('transition-table', states, alphabet);
    }

    statesInput.addEventListener('input', updateTransitionTable);
    alphabetInput.addEventListener('input', updateTransitionTable);

    // Initialize with default values
    updateTransitionTable();

    // Set up default transition values for a good example
    setTimeout(() => {
        const table = document.querySelector('#transition-table table');
        if (table) {
            const inputs = table.querySelectorAll('input');
            const defaultTransitions = {
                'q0,0': 'q1',
                'q0,1': 'q0',
                'q1,0': 'q1',
                'q1,1': 'q2',
                'q2,0': 'q1',
                'q2,1': 'q0'
            };

            inputs.forEach(input => {
                const key = input.dataset.transition;
                if (defaultTransitions[key]) {
                    input.value = defaultTransitions[key];
                }
            });
        }
    }, 200);

    buildButton.addEventListener('click', () => {
        try {
            const states = parseInput(statesInput.value);
            const alphabet = parseInput(alphabetInput.value);
            const initialState = initialSelect.value;
            const finalStates = parseInput(finalInput.value);

            if (states.length === 0) throw new Error('Please specify at least one state');
            if (alphabet.length === 0) throw new Error('Please specify at least one symbol');
            if (!initialState) throw new Error('Please select an initial state');

            // Validate final states
            for (const state of finalStates) {
                if (!states.includes(state)) {
                    throw new Error(`Final state '${state}' not found in states list`);
                }
            }

            // Build transitions object
            const transitions = {};
            const table = document.querySelector('#transition-table table');
            if (table) {
                const inputs = table.querySelectorAll('input');
                inputs.forEach(input => {
                    const [state, symbol] = input.dataset.transition.split(',');
                    const target = input.value.trim();
                    if (target && states.includes(target)) {
                        transitions[`${state},${symbol}`] = target;
                    }
                });
            }

            currentDFA = new DFA(states, alphabet, transitions, initialState, finalStates);
            visualizer.visualizeDFA(currentDFA);

            showResult('test-result', true, 'DFA built successfully!',
                      `States: ${states.length}, Alphabet size: ${alphabet.length}`);
        } catch (error) {
            showResult('test-result', false, 'Error building DFA', error.message);
        }
    });

    testButton.addEventListener('click', () => {
        if (!currentDFA) {
            showResult('test-result', false, 'Please build a DFA first');
            return;
        }

        const testString = testInput.value;
        const result = currentDFA.accepts(testString);

        if (result.error) {
            showResult('test-result', false, 'Error testing string', result.error);
            return;
        }

        showResult('test-result', result.accepted,
                  `String '${testString}'`,
                  `Path: ${result.trace.join(' → ')}`);

        // Show step-by-step trace
        showStepTrace('step-trace', testString, result.trace);

        // Animate the path
        animateDFAPath(visualizer, currentDFA, testString, result.trace);
    });

    clearButton.addEventListener('click', () => {
        statesInput.value = 'q0,q1,q2';
        alphabetInput.value = '0,1';
        finalInput.value = 'q2';
        updateTransitionTable();

        // Set default transition values for a clear example
        setTimeout(() => {
            const table = document.querySelector('#transition-table table');
            if (table) {
                const inputs = table.querySelectorAll('input');
                const defaultTransitions = {
                    'q0,0': 'q1',
                    'q0,1': 'q0',
                    'q1,0': 'q1',
                    'q1,1': 'q2',
                    'q2,0': 'q1',
                    'q2,1': 'q0'
                };

                inputs.forEach(input => {
                    const key = input.dataset.transition;
                    if (defaultTransitions[key]) {
                        input.value = defaultTransitions[key];
                    }
                });
            }
        }, 100);

        visualizer.clear();
        document.getElementById('test-result').innerHTML = '';
        document.getElementById('step-trace').innerHTML = '';
        currentDFA = null;
    });

    centerButton.addEventListener('click', () => {
        visualizer.centerGraph();
    });
}

// Continued in the next section due to length...
// ===== CONTINUATION OF SCRIPT.JS =====

// ===== UTILITY FUNCTIONS FOR UI =====
function updateInitialStateSelect(states, selectElement) {
    selectElement.innerHTML = '<option value="">Select initial state</option>';
    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        selectElement.appendChild(option);
    });

    // Auto-select first state if available
    if (states.length > 0) {
        selectElement.value = states[0];
    }
}

function generateTransitionTable(containerId, states, alphabet) {
    const container = document.getElementById(containerId);

    if (states.length === 0 || alphabet.length === 0) {
        container.innerHTML = '<p class="text-secondary">Enter states and alphabet to generate transition table</p>';
        return;
    }

    let tableHTML = '<table><thead><tr><th>δ</th>';
    alphabet.forEach(symbol => {
        tableHTML += `<th>${symbol}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    states.forEach(state => {
        tableHTML += `<tr><th>${state}</th>`;
        alphabet.forEach(symbol => {
            tableHTML += `<td><input type="text" data-transition="${state},${symbol}" placeholder="→"></td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

// Generate NFA transition table
function generateNFATransitionTable(nfa, regex) {
    // Create container for NFA transition table if it doesn't exist
    let tableContainer = document.getElementById('nfa-transition-table');
    if (!tableContainer) {
        // Find the NFA result container and add table after it
        const nfaResultContainer = document.getElementById('nfa-test-result');
        if (nfaResultContainer) {
            tableContainer = document.createElement('div');
            tableContainer.id = 'nfa-transition-table';
            tableContainer.className = 'transition-table-container';
            nfaResultContainer.parentNode.insertBefore(tableContainer, nfaResultContainer.nextSibling);
        } else {
            console.error('Could not find NFA result container');
            return;
        }
    }

    // Get all transitions from NFA
    const transitions = nfa.getTransitions();

    // Get all states and symbols
    const states = [...new Set(nfa.states.map(state => state.name))].sort();
    const symbols = [...new Set(transitions.map(t => t.symbol))].sort();

    // Separate epsilon and regular symbols
    const regularSymbols = symbols.filter(s => s !== 'ε');
    const hasEpsilon = symbols.includes('ε');

    // Build transition table HTML
    let tableHTML = `
        <div class="nfa-table-header">
            <h4>📊 NFA Transition Table</h4>
            <p><strong>Regex:</strong> ${regex}</p>
            <p><strong>Start State:</strong> ${nfa.startState.name} | <strong>Accept State:</strong> ${nfa.acceptState.name}</p>
        </div>
        <div class="table-responsive">
            <table class="nfa-transition-table">
                <thead>
                    <tr>
                        <th>State</th>`;

    // Add regular symbol columns
    regularSymbols.forEach(symbol => {
        tableHTML += `<th>${symbol}</th>`;
    });

    // Add epsilon column if exists
    if (hasEpsilon) {
        tableHTML += `<th>ε</th>`;
    }

    tableHTML += `</tr></thead><tbody>`;

    // Build transition map for quick lookup
    const transitionMap = new Map();
    transitions.forEach(t => {
        const key = `${t.from},${t.symbol}`;
        if (!transitionMap.has(key)) {
            transitionMap.set(key, []);
        }
        transitionMap.get(key).push(t.to);
    });

    // Add rows for each state
    states.forEach(state => {
        tableHTML += `<tr><th class="state-name">${state}</th>`;

        // Add regular symbol transitions
        regularSymbols.forEach(symbol => {
            const key = `${state},${symbol}`;
            const targets = transitionMap.get(key) || [];
            const targetStr = targets.length > 0 ? `{${targets.join(', ')}}` : '∅';
            tableHTML += `<td>${targetStr}</td>`;
        });

        // Add epsilon transitions
        if (hasEpsilon) {
            const key = `${state},ε`;
            const targets = transitionMap.get(key) || [];
            const targetStr = targets.length > 0 ? `{${targets.join(', ')}}` : '∅';
            tableHTML += `<td>${targetStr}</td>`;
        }

        tableHTML += '</tr>';
    });

    tableHTML += `</tbody></table></div>`;

    // Add statistics
    const regularTransitions = transitions.filter(t => t.symbol !== 'ε');
    const epsilonTransitions = transitions.filter(t => t.symbol === 'ε');

    tableHTML += `
        <div class="nfa-stats">
            <div class="stat-item">
                <span class="stat-label">Total States:</span>
                <span class="stat-value">${states.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Regular Transitions:</span>
                <span class="stat-value">${regularTransitions.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">ε-Transitions:</span>
                <span class="stat-value">${epsilonTransitions.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Transitions:</span>
                <span class="stat-value">${transitions.length}</span>
            </div>
        </div>
    `;

    tableContainer.innerHTML = tableHTML;
}

// Generate minimized DFA transition table
function generateMinimizedDFATransitionTable(originalDFA, minimizedDFA, stateMapping) {
    // Create container for minimized DFA transition table if it doesn't exist
    let tableContainer = document.getElementById('minimized-dfa-transition-table');
    if (!tableContainer) {
        // Find the minimization stats container and add table after it
        const statsContainer = document.getElementById('minimization-stats');
        if (statsContainer) {
            tableContainer = document.createElement('div');
            tableContainer.id = 'minimized-dfa-transition-table';
            tableContainer.className = 'transition-table-container';
            statsContainer.parentNode.insertBefore(tableContainer, statsContainer.nextSibling);
        } else {
            console.error('Could not find minimization stats container');
            return;
        }
    }

    // Get alphabet and states from minimized DFA
    const alphabet = [...minimizedDFA.alphabet].sort();
    const states = [...minimizedDFA.states].sort();

    // Build transition table HTML
    let tableHTML = `
        <div class="dfa-table-header">
            <h4>📊 Minimized DFA Transition Table</h4>
            <div class="comparison-info">
                <div class="comparison-item">
                    <span class="comparison-label">Original States:</span>
                    <span class="comparison-value">${originalDFA.states.size}</span>
                </div>
                <div class="comparison-item">
                    <span class="comparison-label">Minimized States:</span>
                    <span class="comparison-value">${minimizedDFA.states.size}</span>
                </div>
                <div class="comparison-item">
                    <span class="comparison-label">Reduction:</span>
                    <span class="comparison-value">${((originalDFA.states.size - minimizedDFA.states.size) / originalDFA.states.size * 100).toFixed(1)}%</span>
                </div>
            </div>
            <p><strong>Start State:</strong> ${minimizedDFA.initialState} | <strong>Final States:</strong> {${[...minimizedDFA.finalStates].join(', ')}}</p>
        </div>
        <div class="table-responsive">
            <table class="dfa-transition-table">
                <thead>
                    <tr>
                        <th>State</th>`;

    // Add alphabet columns
    alphabet.forEach(symbol => {
        tableHTML += `<th>${symbol}</th>`;
    });

    tableHTML += `</tr></thead><tbody>`;

    // Add rows for each state
    states.forEach(state => {
        const isInitial = state === minimizedDFA.initialState;
        const isFinal = minimizedDFA.finalStates.has(state);

        let stateClass = 'state-name';
        if (isInitial) stateClass += ' initial-state';
        if (isFinal) stateClass += ' final-state';

        tableHTML += `<tr><th class="${stateClass}">${state}</th>`;

        // Add transitions for each symbol
        alphabet.forEach(symbol => {
            const target = minimizedDFA.transitions[`${state},${symbol}`] || '∅';
            tableHTML += `<td>${target}</td>`;
        });

        tableHTML += '</tr>';
    });

    tableHTML += `</tbody></table></div>`;

    // Add state mapping information
    tableHTML += `
        <div class="state-mapping-section">
            <h5>🔗 State Mapping (Original → Minimized)</h5>
            <div class="mapping-grid">`;

    // Group original states by their minimized state
    const groups = new Map();
    for (const [original, minimized] of stateMapping) {
        if (!groups.has(minimized)) {
            groups.set(minimized, []);
        }
        groups.get(minimized).push(original);
    }

    for (const [minimized, originals] of groups) {
        const isInitial = minimized === minimizedDFA.initialState;
        const isFinal = minimizedDFA.finalStates.has(minimized);

        let badgeClass = 'mapping-badge';
        if (isInitial) badgeClass += ' initial-badge';
        if (isFinal) badgeClass += ' final-badge';

        tableHTML += `
            <div class="mapping-item">
                <div class="${badgeClass}">${minimized}</div>
                <div class="mapping-arrow">←</div>
                <div class="original-states">{${originals.join(', ')}}</div>
            </div>`;
    }

    tableHTML += `
            </div>
        </div>
    `;

    // Add transition comparison
    const originalTransitions = Object.keys(originalDFA.transitions).length;
    const minimizedTransitions = Object.keys(minimizedDFA.transitions).length;

    tableHTML += `
        <div class="transition-stats">
            <div class="stat-item">
                <span class="stat-label">Original Transitions:</span>
                <span class="stat-value">${originalTransitions}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Minimized Transitions:</span>
                <span class="stat-value">${minimizedTransitions}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Alphabet Size:</span>
                <span class="stat-value">${alphabet.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Deterministic:</span>
                <span class="stat-value">✓ Yes</span>
            </div>
        </div>
    `;

    tableContainer.innerHTML = tableHTML;
}

function showStepTrace(containerId, string, trace) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '<h4>Step-by-step trace:</h4>';

    if (string.length === 0) {
        html += `<div class="step-item">Start: ${trace[0]} (empty string)</div>`;
    } else {
        html += `<div class="step-item">Start: ${trace[0]}</div>`;

        for (let i = 0; i < string.length; i++) {
            const symbol = string[i];
            const currentState = trace[i];
            const nextState = trace[i + 1];
            html += `<div class="step-item">Read '${symbol}': ${currentState} → ${nextState}</div>`;
        }
    }

    const finalState = trace[trace.length - 1];
    html += `<div class="step-item">Final state: ${finalState}</div>`;

    container.innerHTML = html;
}

async function animateDFAPath(visualizer, dfa, string, trace) {
    // Reset visualization first
    visualizer.visualizeDFA(dfa);

    if (string.length === 0) {
        // For empty string, just highlight the initial state
        setTimeout(() => {
            visualizer.svg.selectAll('.node')
                .filter(d => d.id === dfa.initialState)
                .select('circle')
                .classed('highlight', true);
        }, 500);
        return;
    }

    // Animate step by step with improved timing and highlighting
    for (let i = 0; i < string.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1200));

        const currentState = trace[i];
        const nextState = trace[i + 1];
        const symbol = string[i];

        // Clear previous highlights
        visualizer.svg.selectAll('.node circle').classed('highlight', false);
        visualizer.svg.selectAll('.link').classed('current', false);

        // Highlight current transition
        visualizer.svg.selectAll('.link')
            .filter(function() {
                const d = d3.select(this).datum();
                return d.source.id === currentState &&
                       d.target.id === nextState &&
                       d.label.includes(symbol);
            })
            .classed('current', true);

        // Highlight target state
        visualizer.svg.selectAll('.node')
            .filter(d => d.id === nextState)
            .select('circle')
            .classed('highlight', true);

        // Update the step trace highlighting
        updateStepTraceHighlight(i + 1);
    }

    // Final state indication
    await new Promise(resolve => setTimeout(resolve, 1000));
    const finalState = trace[trace.length - 1];
    const isAccepted = dfa.finalStates.has(finalState);

    visualizer.svg.selectAll('.node')
        .filter(d => d.id === finalState)
        .select('circle')
        .style('fill', isAccepted ? '#d1fae5' : '#fee2e2')
        .style('stroke', isAccepted ? '#10b981' : '#ef4444');
}

function updateStepTraceHighlight(currentStep) {
    const stepItems = document.querySelectorAll('#step-trace .step-item');
    stepItems.forEach((item, index) => {
        item.classList.remove('current');
        if (index === currentStep) {
            item.classList.add('current');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
}

// ===== REGEX TO NFA =====
function initializeRegexToNFA() {
    const regexInput = document.getElementById('regex-input');
    const convertButton = document.getElementById('convert-regex');
    const testButton = document.getElementById('test-nfa-string');
    const testInput = document.getElementById('nfa-test-string');
    const exampleButtons = document.querySelectorAll('.example-btn');
    const centerButton = document.getElementById('center-nfa-graph');

    const visualizer = new AutomataVisualizer('nfa-visualization');

    // Center graph button
    centerButton.addEventListener('click', () => {
        if (visualizer.simulation) {
            visualizer.centerGraph();
        }
    });

    // Example button handlers
    exampleButtons.forEach(button => {
        button.addEventListener('click', () => {
            regexInput.value = button.getAttribute('data-regex');
        });
    });

    convertButton.addEventListener('click', () => {
        try {
            const regex = regexInput.value.trim();
            if (!regex) {
                showResult('nfa-test-result', false, 'Please enter a regular expression');
                return;
            }

            // Reset state counter for consistent naming
            NFAState.idCounter = 0;

            // Check if user wants to see lambda transitions
            const showLambdaTransitions = document.getElementById('show-lambda-transitions').checked;

            // Use reference-based NFA generation with lambda toggle
            currentNFA = ReferenceRegexToNFA.convert(regex, showLambdaTransitions);

            visualizer.visualizeNFA(currentNFA);

            // Generate and display NFA transition table
            generateNFATransitionTable(currentNFA, regex);

            // Update result message with NFA type
            const nfaType = showLambdaTransitions ? 'NFAλ (with λ-transitions)' : 'NFA (clean)';
            showResult('nfa-test-result', true, `${nfaType} generated successfully!`,
                      `Regex: ${regex}, States: ${currentNFA.states.length}`);
        } catch (error) {
            showResult('nfa-test-result', false, 'Error converting regex', error.message);
        }
    });

    // Add event listener for lambda toggle
    const lambdaToggle = document.getElementById('show-lambda-transitions');
    lambdaToggle.addEventListener('change', () => {
        // If there's already a converted NFA, re-convert with new setting
        if (currentNFA && regexInput.value.trim()) {
            convertButton.click(); // Trigger re-conversion
        }
    });

    testButton.addEventListener('click', () => {
        if (!currentNFA) {
            showResult('nfa-test-result', false, 'Please convert a regex first');
            return;
        }

        const testString = testInput.value;
        const result = currentNFA.acceptsWithTrace(testString);

        showResult('nfa-test-result', result.accepted,
                  `String '${testString}'`,
                  `Regular expression: ${regexInput.value}`);

        // Show step-by-step trace for NFA
        showNFAStepTrace('nfa-step-trace', testString, result.trace);

        // Animate the NFA path
        animateNFAPath(visualizer, currentNFA, testString, result.trace);
    });
}

// ===== DFA MINIMIZATION =====
function initializeDFAMinimization() {
    const statesInput = document.getElementById('min-states');
    const alphabetInput = document.getElementById('min-alphabet');
    const initialSelect = document.getElementById('min-initial');
    const finalInput = document.getElementById('min-final');
    const minimizeButton = document.getElementById('minimize-dfa');

    const originalVisualizer = new AutomataVisualizer('original-dfa-viz');
    const minimizedVisualizer = new AutomataVisualizer('minimized-dfa-viz');

    // Add center button functionality
    document.getElementById('center-original-dfa').addEventListener('click', () => {
        originalVisualizer.centerGraph();
    });

    document.getElementById('center-minimized-dfa').addEventListener('click', () => {
        minimizedVisualizer.centerGraph();
    });

    // Update transition table when states or alphabet change
    function updateMinTransitionTable() {
        const states = parseInput(statesInput.value);
        const alphabet = parseInput(alphabetInput.value);

        updateInitialStateSelect(states, initialSelect);
        generateTransitionTable('min-transition-table', states, alphabet);
    }

    statesInput.addEventListener('input', updateMinTransitionTable);
    alphabetInput.addEventListener('input', updateMinTransitionTable);

    // Initialize with default values
    updateMinTransitionTable();

    minimizeButton.addEventListener('click', () => {
        try {
            const states = parseInput(statesInput.value);
            const alphabet = parseInput(alphabetInput.value);
            const initialState = initialSelect.value;
            const finalStates = parseInput(finalInput.value);

            if (states.length === 0) throw new Error('Please specify at least one state');
            if (alphabet.length === 0) throw new Error('Please specify at least one symbol');
            if (!initialState) throw new Error('Please select an initial state');

            // Validate final states
            for (const state of finalStates) {
                if (!states.includes(state)) {
                    throw new Error(`Final state '${state}' not found in states list`);
                }
            }

            // Build transitions object
            const transitions = {};
            const table = document.querySelector('#min-transition-table table');
            if (table) {
                const inputs = table.querySelectorAll('input');
                inputs.forEach(input => {
                    const [state, symbol] = input.dataset.transition.split(',');
                    const target = input.value.trim();
                    if (target && states.includes(target)) {
                        transitions[`${state},${symbol}`] = target;
                    }
                });
            }

            // Create original DFA
            const originalDFA = new DFA(states, alphabet, transitions, initialState, finalStates);

            // Minimize DFA
            const minimizedResult = DFAMinimizer.minimize(originalDFA);
            const minimizedDFA = new DFA(
                [...minimizedResult.states],
                [...minimizedResult.alphabet],
                minimizedResult.transitions,
                minimizedResult.initialState,
                [...minimizedResult.finalStates]
            );

            // Visualize both
            originalVisualizer.visualizeDFA(originalDFA);
            minimizedVisualizer.visualizeDFA(minimizedDFA);

            // Generate and display minimized DFA transition table
            generateMinimizedDFATransitionTable(originalDFA, minimizedDFA, minimizedResult.stateMapping);

            // Show statistics
            showMinimizationStats(states.length, minimizedResult.states.size, minimizedResult.stateMapping);

        } catch (error) {
            showMinimizationStats(0, 0, new Map(), error.message);
        }
    });
}

function showMinimizationStats(originalCount, minimizedCount, stateMapping, error = null) {
    const container = document.getElementById('minimization-stats');

    if (error) {
        container.innerHTML = `
            <h4>Minimization Error</h4>
            <div class="test-result rejected">
                <i class="fas fa-times-circle"></i>
                <strong>Error:</strong> ${error}
            </div>
        `;
        return;
    }

    const reduction = originalCount > 0 ? ((originalCount - minimizedCount) / originalCount * 100).toFixed(1) : 0;

    let html = `
        <h4>Minimization Results</h4>
        <div class="stat-item">
            <span class="stat-label">Original States:</span>
            <span class="stat-value">${originalCount}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Minimized States:</span>
            <span class="stat-value">${minimizedCount}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Reduction:</span>
            <span class="stat-value">${reduction}%</span>
        </div>
        <h4>State Mapping</h4>
    `;

    // Group original states by their minimized state
    const groups = new Map();
    for (const [original, minimized] of stateMapping) {
        if (!groups.has(minimized)) {
            groups.set(minimized, []);
        }
        groups.get(minimized).push(original);
    }

    for (const [minimized, originals] of groups) {
        html += `
            <div class="stat-item">
                <span class="stat-label">${minimized}:</span>
                <span class="stat-value">{${originals.join(', ')}}</span>
            </div>
        `;
    }

    container.innerHTML = html;
}

// ===== DFA EQUIVALENCE =====
function initializeDFAEquivalence() {
    const eq1StatesInput = document.getElementById('eq1-states');
    const eq1AlphabetInput = document.getElementById('eq1-alphabet');
    const eq1InitialSelect = document.getElementById('eq1-initial');
    const eq1FinalInput = document.getElementById('eq1-final');

    const eq2StatesInput = document.getElementById('eq2-states');
    const eq2AlphabetInput = document.getElementById('eq2-alphabet');
    const eq2InitialSelect = document.getElementById('eq2-initial');
    const eq2FinalInput = document.getElementById('eq2-final');

    const checkButton = document.getElementById('check-equivalence');

    const dfa1Visualizer = new AutomataVisualizer('eq-dfa1-viz');
    const dfa2Visualizer = new AutomataVisualizer('eq-dfa2-viz');

    // Add center button functionality
    document.getElementById('center-eq-dfa1').addEventListener('click', () => {
        dfa1Visualizer.centerGraph();
    });

    document.getElementById('center-eq-dfa2').addEventListener('click', () => {
        dfa2Visualizer.centerGraph();
    });

    // Update transition tables
    function updateEq1TransitionTable() {
        const states = parseInput(eq1StatesInput.value);
        const alphabet = parseInput(eq1AlphabetInput.value);

        updateInitialStateSelect(states, eq1InitialSelect);
        generateTransitionTable('eq1-transition-table', states, alphabet);
    }

    function updateEq2TransitionTable() {
        const states = parseInput(eq2StatesInput.value);
        const alphabet = parseInput(eq2AlphabetInput.value);

        updateInitialStateSelect(states, eq2InitialSelect);
        generateTransitionTable('eq2-transition-table', states, alphabet);
    }

    eq1StatesInput.addEventListener('input', updateEq1TransitionTable);
    eq1AlphabetInput.addEventListener('input', updateEq1TransitionTable);
    eq2StatesInput.addEventListener('input', updateEq2TransitionTable);
    eq2AlphabetInput.addEventListener('input', updateEq2TransitionTable);

    // Initialize with default values
    updateEq1TransitionTable();
    updateEq2TransitionTable();

    checkButton.addEventListener('click', () => {
        try {
            // Build DFA 1
            const states1 = parseInput(eq1StatesInput.value);
            const alphabet1 = parseInput(eq1AlphabetInput.value);
            const initial1 = eq1InitialSelect.value;
            const final1 = parseInput(eq1FinalInput.value);

            if (states1.length === 0) throw new Error('DFA 1: Please specify at least one state');
            if (alphabet1.length === 0) throw new Error('DFA 1: Please specify at least one symbol');
            if (!initial1) throw new Error('DFA 1: Please select an initial state');

            const transitions1 = {};
            const table1 = document.querySelector('#eq1-transition-table table');
            if (table1) {
                const inputs = table1.querySelectorAll('input');
                inputs.forEach(input => {
                    const [state, symbol] = input.dataset.transition.split(',');
                    const target = input.value.trim();
                    if (target && states1.includes(target)) {
                        transitions1[`${state},${symbol}`] = target;
                    }
                });
            }

            // Build DFA 2
            const states2 = parseInput(eq2StatesInput.value);
            const alphabet2 = parseInput(eq2AlphabetInput.value);
            const initial2 = eq2InitialSelect.value;
            const final2 = parseInput(eq2FinalInput.value);

            if (states2.length === 0) throw new Error('DFA 2: Please specify at least one state');
            if (alphabet2.length === 0) throw new Error('DFA 2: Please specify at least one symbol');
            if (!initial2) throw new Error('DFA 2: Please select an initial state');

            const transitions2 = {};
            const table2 = document.querySelector('#eq2-transition-table table');
            if (table2) {
                const inputs = table2.querySelectorAll('input');
                inputs.forEach(input => {
                    const [state, symbol] = input.dataset.transition.split(',');
                    const target = input.value.trim();
                    if (target && states2.includes(target)) {
                        transitions2[`${state},${symbol}`] = target;
                    }
                });
            }

            const dfa1 = new DFA(states1, alphabet1, transitions1, initial1, final1);
            const dfa2 = new DFA(states2, alphabet2, transitions2, initial2, final2);

            // Check equivalence with detailed analysis
            const equivalenceResult = DFAEquivalenceChecker.areEquivalentWithAnalysis(dfa1, dfa2);

            // Visualize both DFAs
            dfa1Visualizer.visualizeDFA(dfa1);
            dfa2Visualizer.visualizeDFA(dfa2);

            // Show result with detailed analysis
            showEquivalenceResult(equivalenceResult.equivalent, null, equivalenceResult.analysis, dfa1, dfa2);

        } catch (error) {
            showEquivalenceResult(false, error.message);
        }
    });
}

function showEquivalenceResult(equivalent, error = null, analysis = null, dfa1 = null, dfa2 = null) {
    const statusElement = document.getElementById('equivalence-status');
    const analysisElement = document.getElementById('equivalence-analysis');

    if (error) {
        statusElement.className = 'equivalence-status not-equivalent';
        statusElement.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error</p>
            <small>${error}</small>
        `;
        analysisElement.innerHTML = '';
        return;
    }

    if (equivalent) {
        statusElement.className = 'equivalence-status equivalent';
        statusElement.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <p>EQUIVALENT</p>
            <small>Both DFAs accept the same language</small>
        `;
    } else {
        statusElement.className = 'equivalence-status not-equivalent';
        statusElement.innerHTML = `
            <i class="fas fa-times-circle"></i>
            <p>NOT EQUIVALENT</p>
            <small>DFAs accept different languages</small>
        `;
    }

    // Generate detailed analysis
    if (analysis && dfa1 && dfa2) {
        generateEquivalenceAnalysis(analysis, dfa1, dfa2, equivalent);
    }
}

function generateEquivalenceAnalysis(analysis, dfa1, dfa2, equivalent) {
    const analysisElement = document.getElementById('equivalence-analysis');

    let analysisHTML = `
        <div class="analysis-header">
            <h4>🔍 Detailed Equivalence Analysis</h4>
            <p>Step-by-step analysis of why these DFAs are ${equivalent ? 'equivalent' : 'not equivalent'}</p>
        </div>
        <div class="analysis-content">
    `;

    // Section 1: DFA Comparison Overview
    analysisHTML += `
        <div class="analysis-section">
            <h5><i class="fas fa-info-circle"></i> DFA Comparison Overview</h5>
            <div class="comparison-tables">
                <div class="comparison-table">
                    <h6>DFA 1 Transition Table</h6>
                    ${generateComparisonTable(dfa1, analysis.combinedAlphabet)}
                </div>
                <div class="comparison-table">
                    <h6>DFA 2 Transition Table</h6>
                    ${generateComparisonTable(dfa2, analysis.combinedAlphabet)}
                </div>
            </div>
        </div>
    `;

    // Section 2: State Correspondence
    if (equivalent) {
        analysisHTML += `
            <div class="analysis-section">
                <h5><i class="fas fa-link"></i> State Correspondence</h5>
                <p>The following states correspond to each other during the equivalence check:</p>
                <div class="state-correspondence">
        `;

        for (const [state1, state2] of analysis.visitedPairs) {
            analysisHTML += `
                <div class="correspondence-item">
                    <span class="state-badge">${state1}</span>
                    <span>↔</span>
                    <span class="state-badge dfa2">${state2}</span>
                </div>
            `;
        }

        analysisHTML += `
                </div>
            </div>
        `;
    }

    // Section 3: Equivalence Explanation
    if (equivalent) {
        analysisHTML += `
            <div class="analysis-section">
                <h5><i class="fas fa-check-circle"></i> Why They Are Equivalent</h5>
                <div class="equivalence-explanation">
                    <h6>✅ Equivalence Confirmed</h6>
                    <p>The DFAs are equivalent because:</p>
                    <ul>
                        <li><strong>State Correspondence:</strong> Every reachable state pair (q₁, q₂) has the same finality (both accepting or both non-accepting)</li>
                        <li><strong>Transition Consistency:</strong> For every symbol in the alphabet, corresponding states transition to corresponding states</li>
                        <li><strong>Language Acceptance:</strong> Both DFAs accept exactly the same set of strings</li>
                        <li><strong>Visited ${analysis.visitedPairs.length} state pairs</strong> during the equivalence check</li>
                    </ul>
                </div>
            </div>
        `;
    } else {
        const diff = analysis.differenceFound;
        analysisHTML += `
            <div class="analysis-section">
                <h5><i class="fas fa-times-circle"></i> Why They Are NOT Equivalent</h5>
                <div class="equivalence-explanation not-equivalent">
                    <h6>❌ Difference Found</h6>
        `;

        if (diff.type === 'finality') {
            analysisHTML += `
                <p><strong>Finality Difference:</strong> States <code>${diff.state1}</code> and <code>${diff.state2}</code> have different finality:</p>
                <ul>
                    <li>State <code>${diff.state1}</code> in DFA 1: ${diff.isFinal1 ? 'ACCEPTING' : 'NON-ACCEPTING'}</li>
                    <li>State <code>${diff.state2}</code> in DFA 2: ${diff.isFinal2 ? 'ACCEPTING' : 'NON-ACCEPTING'}</li>
                </ul>
                <p>This means there exists at least one string that is accepted by one DFA but rejected by the other.</p>
            `;
        } else if (diff.type === 'transition') {
            analysisHTML += `
                <p><strong>Transition Difference:</strong> From states <code>${diff.state1}</code> and <code>${diff.state2}</code> on symbol <code>${diff.symbol}</code>:</p>
                <ul>
                    <li>DFA 1 transitions to: <code>${diff.next1 || 'undefined'}</code></li>
                    <li>DFA 2 transitions to: <code>${diff.next2 || 'undefined'}</code></li>
                </ul>
                <p>This structural difference means the DFAs will behave differently on certain input strings.</p>
            `;
        }

        analysisHTML += `
                </div>
            </div>
        `;
    }

    // Section 4: Algorithm Details
    analysisHTML += `
        <div class="analysis-section">
            <h5><i class="fas fa-cogs"></i> Algorithm Details</h5>
            <p>The equivalence check used a <strong>breadth-first search</strong> approach:</p>
            <ul>
                <li><strong>Combined Alphabet:</strong> {${[...analysis.combinedAlphabet].join(', ')}}</li>
                <li><strong>State Pairs Explored:</strong> ${analysis.visitedPairs.length}</li>
                <li><strong>Total DFA 1 States:</strong> ${analysis.totalDFA1.states.size} (including dead states)</li>
                <li><strong>Total DFA 2 States:</strong> ${analysis.totalDFA2.states.size} (including dead states)</li>
                <li><strong>Method:</strong> Cross-product state exploration with finality checking</li>
            </ul>
        </div>
    `;

    analysisHTML += `
        </div>
    `;

    analysisElement.innerHTML = analysisHTML;
}

function generateComparisonTable(dfa, alphabet) {
    const states = [...dfa.states].sort();
    const symbols = [...alphabet].sort();

    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>State</th>
    `;

    symbols.forEach(symbol => {
        tableHTML += `<th>${symbol}</th>`;
    });

    tableHTML += `</tr></thead><tbody>`;

    states.forEach(state => {
        const isInitial = state === dfa.initialState;
        const isFinal = dfa.finalStates.has(state);

        let stateDisplay = state;
        if (isInitial && isFinal) {
            stateDisplay = `→${state}*`;
        } else if (isInitial) {
            stateDisplay = `→${state}`;
        } else if (isFinal) {
            stateDisplay = `${state}*`;
        }

        tableHTML += `<tr><th>${stateDisplay}</th>`;

        symbols.forEach(symbol => {
            const target = dfa.transitions[`${state},${symbol}`] || '∅';
            tableHTML += `<td>${target}</td>`;
        });

        tableHTML += '</tr>';
    });

    tableHTML += `</tbody></table>`;
    return tableHTML;
}

// ===== ENHANCED ERROR HANDLING AND VALIDATION =====
function validateDFAInput(states, alphabet, transitions, initialState, finalStates) {
    // Check for empty inputs
    if (states.length === 0) throw new Error('States cannot be empty');
    if (alphabet.length === 0) throw new Error('Alphabet cannot be empty');
    if (!initialState) throw new Error('Initial state must be specified');

    // Check for duplicate states
    const uniqueStates = new Set(states);
    if (uniqueStates.size !== states.length) {
        throw new Error('Duplicate states found');
    }

    // Check for duplicate alphabet symbols
    const uniqueSymbols = new Set(alphabet);
    if (uniqueSymbols.size !== alphabet.length) {
        throw new Error('Duplicate alphabet symbols found');
    }

    // Validate initial state
    if (!states.includes(initialState)) {
        throw new Error('Initial state must be in the states list');
    }

    // Validate final states
    for (const finalState of finalStates) {
        if (!states.includes(finalState)) {
            throw new Error(`Final state '${finalState}' not found in states list`);
        }
    }

    // Validate transitions completeness
    const missingTransitions = [];
    for (const state of states) {
        for (const symbol of alphabet) {
            const key = `${state},${symbol}`;
            if (!transitions[key]) {
                missingTransitions.push(`δ(${state}, ${symbol})`);
            } else if (!states.includes(transitions[key])) {
                throw new Error(`Invalid transition target '${transitions[key]}' for δ(${state}, ${symbol})`);
            }
        }
    }

    if (missingTransitions.length > 0) {
        throw new Error(`Missing transitions: ${missingTransitions.join(', ')}`);
    }

    return true;
}

function validateRegex(regex) {
    // Basic regex validation
    if (!regex || regex.trim().length === 0) {
        throw new Error('Regular expression cannot be empty');
    }

    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of regex) {
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        if (parenCount < 0) {
            throw new Error('Unbalanced parentheses: too many closing parentheses');
        }
    }

    if (parenCount > 0) {
        throw new Error('Unbalanced parentheses: too many opening parentheses');
    }

    // Check for invalid operator placement
    const operators = ['|', '*', '+'];
    if (operators.includes(regex[0]) && regex[0] !== '*' && regex[0] !== '+') {
        throw new Error('Regular expression cannot start with binary operator');
    }

    return true;
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + Enter to build/convert in current tab
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();

        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return;

        const activeTabId = activeTab.id;

        switch (activeTabId) {
            case 'dfa-simulator':
                document.getElementById('build-dfa').click();
                break;
            case 'regex-nfa':
                document.getElementById('convert-regex').click();
                break;
            case 'dfa-minimization':
                document.getElementById('minimize-dfa').click();
                break;
            case 'dfa-equivalence':
                document.getElementById('check-equivalence').click();
                break;
        }
    }

    // Escape to clear current tab
    if (event.key === 'Escape') {
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return;

        const activeTabId = activeTab.id;

        if (activeTabId === 'dfa-simulator') {
            document.getElementById('clear-dfa').click();
        }
    }
});

// ===== EXPORT/IMPORT FUNCTIONALITY =====
function exportDFA(dfa, filename = 'dfa.json') {
    const data = {
        type: 'DFA',
        states: Array.from(dfa.states),
        alphabet: Array.from(dfa.alphabet),
        transitions: dfa.transitions,
        initialState: dfa.initialState,
        finalStates: Array.from(dfa.finalStates),
        timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===== NFA STEP TRACE DISPLAY =====
function showNFAStepTrace(containerId, string, trace) {
    const container = document.getElementById(containerId);
    if (!container) {
        // Create step trace container if it doesn't exist
        const newContainer = document.createElement('div');
        newContainer.id = containerId;
        newContainer.className = 'step-trace-container';

        // Find the NFA test result container and add after it
        const resultContainer = document.getElementById('nfa-test-result');
        if (resultContainer && resultContainer.parentNode) {
            resultContainer.parentNode.insertBefore(newContainer, resultContainer.nextSibling);
        }
    }

    const targetContainer = document.getElementById(containerId);
    if (!targetContainer) return;

    let html = `
        <div class="step-trace">
            <h4>📋 Step-by-Step NFA Execution</h4>
            <div class="trace-info">
                <span class="trace-string">Input: "${string}"</span>
                <span class="trace-length">Length: ${string.length}</span>
            </div>
            <div class="trace-steps">
    `;

    trace.forEach((step, index) => {
        const isLast = index === trace.length - 1;
        const stepClass = isLast ? (step.currentStates.length > 0 ? 'step-final' : 'step-reject') : 'step-normal';

        html += `
            <div class="trace-step ${stepClass}" data-step="${step.step}">
                <div class="step-header">
                    <span class="step-number">Step ${step.step}</span>
                    ${step.symbol ? `<span class="step-symbol">Read: '${step.symbol}'</span>` : '<span class="step-symbol">Initial</span>'}
                </div>
                <div class="step-states">
                    <strong>Current States:</strong> {${step.currentStates.join(', ') || '∅'}}
                </div>
                <div class="step-description">${step.description}</div>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    targetContainer.innerHTML = html;
}

// ===== NFA PATH ANIMATION =====
async function animateNFAPath(visualizer, nfa, string, trace) {
    // Reset visualization first
    visualizer.visualizeNFA(nfa);

    if (string.length === 0) {
        // For empty string, just highlight the initial states
        setTimeout(() => {
            const initialStates = trace[0].currentStates;
            visualizer.svg.selectAll('.node')
                .filter(d => initialStates.includes(d.id))
                .select('circle')
                .classed('highlight', true);
        }, 500);
        return;
    }

    // Animate each step
    for (let i = 0; i < trace.length; i++) {
        const step = trace[i];

        // Highlight step in trace
        const stepElements = document.querySelectorAll('.trace-step');
        stepElements.forEach(el => el.classList.remove('active'));
        const currentStepElement = document.querySelector(`[data-step="${step.step}"]`);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
            currentStepElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Clear previous highlights
        visualizer.svg.selectAll('.node circle')
            .classed('highlight', false)
            .classed('current', false);

        visualizer.svg.selectAll('.link')
            .classed('highlight', false);

        // Highlight current states
        if (step.currentStates.length > 0) {
            visualizer.svg.selectAll('.node')
                .filter(d => step.currentStates.includes(d.id))
                .select('circle')
                .classed('current', true)
                .transition()
                .duration(300)
                .attr('r', 25)
                .transition()
                .duration(300)
                .attr('r', 20);
        }

        // If not the last step, highlight the transition
        if (i < trace.length - 1 && step.symbol) {
            const nextStep = trace[i + 1];

            // Highlight transitions for the current symbol
            visualizer.svg.selectAll('.link')
                .filter(d => {
                    const labels = d.label.split(', ');
                    return labels.includes(step.symbol) &&
                           step.currentStates.includes(d.source.id || d.source) &&
                           nextStep.currentStates.includes(d.target.id || d.target);
                })
                .classed('highlight', true);
        }

        // Wait before next step
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Final highlighting
    const finalStep = trace[trace.length - 1];
    const accepted = finalStep.currentStates.includes(nfa.acceptState.name);

    visualizer.svg.selectAll('.node')
        .filter(d => finalStep.currentStates.includes(d.id))
        .select('circle')
        .classed('current', false)
        .classed('highlight', true)
        .classed('accepted', accepted)
        .classed('rejected', !accepted);
}

// ===== ENHANCED ANIMATIONS =====
function animateNodeTransition(visualizer, fromNode, toNode, symbol) {
    // Add animation effects for state transitions
    const svg = visualizer.svg;
    if (!svg) return;

    // Highlight current transition
    svg.selectAll('.node')
        .classed('current', false);

    svg.selectAll('.node')
        .filter(d => d.id === toNode)
        .classed('current', true)
        .select('circle')
        .transition()
        .duration(500)
        .attr('r', visualizer.nodeRadius + 5)
        .transition()
        .duration(500)
        .attr('r', visualizer.nodeRadius);
}

// ===== TUTORIAL/HELP SYSTEM =====
function showHelp(section) {
    const helpContent = {
        'dfa': `
            <h3>DFA Simulator Help</h3>
            <p>Build and test Deterministic Finite Automata:</p>
            <ul>
                <li>Enter states separated by commas (e.g., q0,q1,q2)</li>
                <li>Enter alphabet symbols separated by commas (e.g., 0,1)</li>
                <li>Select the initial state from the dropdown</li>
                <li>Enter final states separated by commas</li>
                <li>Fill the transition table completely</li>
                <li>Click "Build DFA" to create the automaton</li>
                <li>Test strings to see if they are accepted</li>
            </ul>
        `,
        'nfa': `
            <h3>Regular Expression to NFA Help</h3>
            <p>Convert regular expressions to NFAs:</p>
            <ul>
                <li>Supported operators: | (union), * (Kleene star), + (one or more)</li>
                <li>Use parentheses for grouping</li>
                <li>Examples: (a|b)*, a+b*, (ab)*</li>
                <li>Click examples to load them automatically</li>
            </ul>
        `
    };

    // Implementation for help modal would go here
    console.log(helpContent[section]);
}

// ===== PERFORMANCE OPTIMIZATIONS =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debouncing to input handlers
const debouncedUpdateTransitionTable = debounce(function() {
    // Update transition table logic
}, 300);

console.log('DFA & NFA Analyzer initialized successfully!');
