import matplotlib.pyplot as plt
import networkx as nx

def draw_dfa_matplotlib(states, symbols, transitions, initial, final_states):
    G = nx.MultiDiGraph()

    # Tambah node
    for state in states:
        G.add_node(state, shape='doublecircle' if state in final_states else 'circle')

    # Tambah edge/transisi
    for i, state in enumerate(states):
        for j, symbol in enumerate(symbols):
            next_state = transitions[i][j]
            G.add_edge(state, next_state, label=symbol)

    pos = nx.spring_layout(G, seed=42)  # layout posisi

    plt.figure(figsize=(8, 6))
    nx.draw_networkx_nodes(G, pos, node_size=1000, node_color='skyblue')
    nx.draw_networkx_labels(G, pos)

    # Edge
    edge_labels = {(u, v): [] for u, v in G.edges()}
    for u, v, d in G.edges(data=True):
        edge_labels[(u, v)].append(d['label'])

    # Gabungkan label transisi yang sama
    merged_labels = {k: ','.join(v) for k, v in edge_labels.items()}

    nx.draw_networkx_edges(G, pos, connectionstyle='arc3,rad=0.2', arrows=True, arrowstyle='-|>')
    nx.draw_networkx_edge_labels(G, pos, edge_labels=merged_labels)

    # Tambahkan tanda initial state
    if initial in pos:
        init_pos = pos[initial]
        plt.annotate("→", xy=init_pos, xytext=(init_pos[0] - 0.1, init_pos[1] + 0.1),
                     fontsize=24, fontweight='bold', color='green',
                     arrowprops=dict(arrowstyle='->', lw=1.5, color='green'))

    plt.title("Visualisasi DFA", fontsize=14)
    plt.axis('off')
    plt.tight_layout()
    plt.show()
