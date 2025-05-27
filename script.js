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

// ===== DFA MINIMIZATION =====
class DFAMinimizer {
    static minimize(dfa) {
        const { states, alphabet, transitions, initialState, finalStates } = dfa;
        
        // Initialize partitions: final states and non-final states
        let partitions = [
            [...finalStates],
            [...states].filter(state => !finalStates.has(state))
        ].filter(partition => partition.length > 0);

        let changed = true;
        while (changed) {
            changed = false;
            const newPartitions = [];

            for (const partition of partitions) {
                const groups = new Map();

                for (const state of partition) {
                    const signature = [];
                    for (const symbol of alphabet) {
                        const target = transitions[`${state},${symbol}`];
                        const targetPartition = partitions.findIndex(p => p.includes(target));
                        signature.push(targetPartition);
                    }

                    const signatureKey = signature.join(',');
                    if (!groups.has(signatureKey)) {
                        groups.set(signatureKey, []);
                    }
                    groups.get(signatureKey).push(state);
                }

                if (groups.size > 1) {
                    changed = true;
                }
                
                newPartitions.push(...groups.values());
            }

            partitions = newPartitions;
        }

        // Build minimized DFA
        const stateMapping = new Map();
        partitions.forEach((partition, index) => {
            const newStateName = `S${index}`;
            partition.forEach(state => {
                stateMapping.set(state, newStateName);
            });
        });

        const newStates = new Set(stateMapping.values());
        const newInitialState = stateMapping.get(initialState);
        const newFinalStates = new Set([...finalStates].map(state => stateMapping.get(state)));
        const newTransitions = {};

        for (const state of newStates) {
            for (const symbol of alphabet) {
                // Find original state from this partition
                const originalState = [...stateMapping.entries()]
                    .find(([orig, mapped]) => mapped === state)[0];
                const targetState = transitions[`${originalState},${symbol}`];
                const newTargetState = stateMapping.get(targetState);
                newTransitions[`${state},${symbol}`] = newTargetState;
            }
        }

        return {
            states: newStates,
            alphabet,
            transitions: newTransitions,
            initialState: newInitialState,
            finalStates: newFinalStates,
            stateMapping
        };
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

        // Create links for NFA
        const transitions = nfa.getTransitions();
        const linkGroups = new Map();

        transitions.forEach(transition => {
            const key = `${transition.from}-${transition.to}`;
            if (!linkGroups.has(key)) {
                linkGroups.set(key, {
                    source: transition.from,
                    target: transition.to,
                    labels: []
                });
            }
            linkGroups.get(key).labels.push(transition.symbol);
        });

        linkGroups.forEach(linkData => {
            links.push({
                source: linkData.source,
                target: linkData.target,
                label: linkData.labels.join(', '),
                isCurrent: false,
                isSelfLoop: linkData.source === linkData.target
            });
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
            .attr('stroke', d => d.isCurrent ? '#f59e0b' : '#64748b')
            .attr('stroke-width', d => d.isCurrent ? 3 : 2)
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
            .attr('fill', '#1a202c')
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

    const visualizer = new AutomataVisualizer('nfa-visualization');

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
            
            currentNFA = RegexToNFA.convert(regex);
            visualizer.visualizeNFA(currentNFA);
            
            showResult('nfa-test-result', true, 'NFA generated successfully!', 
                      `Regex: ${regex}, States: ${currentNFA.states.length}`);
        } catch (error) {
            showResult('nfa-test-result', false, 'Error converting regex', error.message);
        }
    });

    testButton.addEventListener('click', () => {
        if (!currentNFA) {
            showResult('nfa-test-result', false, 'Please convert a regex first');
            return;
        }

        const testString = testInput.value;
        const accepted = currentNFA.accepts(testString);
        
        showResult('nfa-test-result', accepted, 
                  `String '${testString}'`, 
                  `Regular expression: ${regexInput.value}`);
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

            // Check equivalence
            const equivalent = DFAEquivalenceChecker.areEquivalent(dfa1, dfa2);

            // Visualize both DFAs
            dfa1Visualizer.visualizeDFA(dfa1);
            dfa2Visualizer.visualizeDFA(dfa2);

            // Show result
            showEquivalenceResult(equivalent);

        } catch (error) {
            showEquivalenceResult(false, error.message);
        }
    });
}

function showEquivalenceResult(equivalent, error = null) {
    const statusElement = document.getElementById('equivalence-status');
    
    if (error) {
        statusElement.className = 'equivalence-status not-equivalent';
        statusElement.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error</p>
            <small>${error}</small>
        `;
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
