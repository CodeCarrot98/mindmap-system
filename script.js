let rawData = JSON.parse(localStorage.getItem('mindmap_v1')) || {
    id: "root", name: "Central Topic", description: "Your core idea", children: []
};

let selectedNode = null;
const colorScale = d3.scaleSequential(d3.interpolateCool).domain([0, 5]);

const svg = d3.select("#canvas")
    .attr("width", window.innerWidth).attr("height", window.innerHeight)
    .call(d3.zoom().on("zoom", (e) => g.attr("transform", e.transform)))
    .append("g");

const g = svg.append("g");

function update() {
    const root = d3.hierarchy(rawData);
    const treeLayout = d3.tree().nodeSize([80, 250]);
    treeLayout(root);

    // Links
    g.selectAll(".link").data(root.links()).join("path")
        .attr("class", "link")
        .attr("stroke", d => colorScale(d.source.depth))
        .attr("d", d3.linkHorizontal().x(d => d.y).y(d => d.x));

    // Nodes
    const nodes = g.selectAll(".node").data(root.descendants(), d => d.data.id || (d.data.id = Math.random()))
        .join("g").attr("class", "node")
        .attr("transform", d => `translate(${d.y},${d.x})`)
        .on("contextmenu", (e, d) => {
            e.preventDefault();
            selectedNode = d;
            const menu = document.getElementById('context-menu');
            menu.style.top = `${e.pageY}px`;
            menu.style.left = `${e.pageX}px`;
            menu.classList.remove('hidden');
        });

    // Rounded Rectangle
    nodes.selectAll("rect").remove();
    nodes.append("rect")
        .attr("width", 160).attr("height", 45).attr("x", -80).attr("y", -22)
        .attr("rx", 10).attr("fill", d => d3.color(colorScale(d.depth)).darker(0.5))
        .attr("stroke", d => colorScale(d.depth))
        .on("click", (e, d) => {
            if (e.shiftKey) { // Add child shortcut
                const name = prompt("Enter Idea:");
                if (name) {
                    if (!d.data.children) d.data.children = [];
                    d.data.children.push({ id: Math.random(), name: name, children: [] });
                    update();
                }
            } else {
                d.data.showDesc = !d.data.showDesc;
                update();
            }
        });

    nodes.append("text").attr("text-anchor", "middle").attr("dy", 4).text(d => d.data.name);
    
    // Collapsible Description
    nodes.filter(d => d.data.showDesc).append("text")
        .attr("class", "desc-text").attr("text-anchor", "middle").attr("dy", 35)
        .text(d => d.data.description || "No details");

    localStorage.setItem('mindmap_v1', JSON.stringify(rawData));
}

// Global click to hide context menu
window.onclick = () => document.getElementById('context-menu').classList.add('hidden');

function deleteBranch() {
    if (!selectedNode.parent) return alert("Cannot delete root");
    const parent = selectedNode.parent.data;
    parent.children = parent.children.filter(c => c.id !== selectedNode.data.id);
    update();
}

function deleteSingleNode() {
    if (!selectedNode.parent) return alert("Cannot delete root");
    const parent = selectedNode.parent.data;
    const children = selectedNode.data.children || [];
    parent.children = parent.children.filter(c => c.id !== selectedNode.data.id);
    parent.children.push(...children); // Reparenting
    update();
}

function exportJSON() {
    const dataStr = JSON.stringify(rawData, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = "map.json"; link.click();
}

function importJSON(e) {
    const reader = new FileReader();
    reader.onload = (event) => { rawData = JSON.parse(event.target.result); update(); };
    reader.readAsText(e.target.files[0]);
}

function resetMap() { if(confirm("Reset?")) { localStorage.clear(); location.reload(); } }

update();
