let rawData = JSON.parse(localStorage.getItem('mindflow_data')) || {
    id: "1", name: "Central Topic", description: "Main idea details...", children: []
};

let selectedNode = null;
const colorScale = d3.scaleSequential(d3.interpolateRainbow).domain([0, 8]);

// Setup Zoom
const zoom = d3.zoom()
    .scaleExtent([0.1, 3])
    .on("zoom", (e) => g.attr("transform", e.transform));

const svg = d3.select("#canvas")
    .attr("width", window.innerWidth).attr("height", window.innerHeight)
    .call(zoom)
    .on("dblclick.zoom", null) // Disable zoom on dblclick for node editing
    .append("g");

const g = svg.append("g");

function update() {
    const root = d3.hierarchy(rawData);
    const treeLayout = d3.tree().nodeSize([100, 280]); 
    treeLayout(root);

    // Curved Links
    g.selectAll(".link").data(root.links(), d => d.target.data.id)
        .join("path").attr("class", "link")
        .attr("stroke", d => colorScale(d.source.depth % 8))
        .attr("d", d3.linkHorizontal().x(d => d.y).y(d => d.x));

    // Nodes
    const nodes = g.selectAll(".node")
        .data(root.descendants(), d => d.data.id || (d.data.id = Date.now() + Math.random()))
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

    nodes.selectAll("rect").remove();
    nodes.append("rect")
        .attr("width", 160).attr("height", 45).attr("x", -80).attr("y", -22)
        .attr("rx", 12).attr("fill", d => d3.color(colorScale(d.depth % 8)).darker(1.5))
        .attr("stroke", d => colorScale(d.depth % 8))
        .on("click", (e, d) => {
            if (e.shiftKey) {
                const name = prompt("Node Name:");
                if (name) {
                    if (!d.data.children) d.data.children = [];
                    d.data.children.push({ id: Date.now(), name: name, description: "New detail", children: [] });
                    update();
                }
            } else {
                d.data.showDesc = !d.data.showDesc;
                update();
            }
        });

    nodes.selectAll("text").remove();
    nodes.append("text").attr("text-anchor", "middle").attr("dy", 5).text(d => d.data.name)
        .on("dblclick", (e, d) => {
            const n = prompt("Rename:", d.data.name);
            if (n) { d.data.name = n; update(); }
        });

    nodes.selectAll("foreignObject").remove();
    nodes.filter(d => d.data.showDesc).append("foreignObject")
        .attr("x", -80).attr("y", 30).attr("width", 160).attr("height", 80)
        .append("xhtml:div").attr("class", "desc-box")
        .html(d => d.data.description)
        .on("click", (e, d) => {
            const desc = prompt("Edit Details:", d.data.description);
            if (desc) { d.data.description = desc; update(); }
        });

    localStorage.setItem('mindflow_data', JSON.stringify(rawData));
}

// Center Map Logic
function centerMap() {
    const bounds = g.node().getBBox();
    const fullWidth = window.innerWidth, fullHeight = window.innerHeight;
    
    if (bounds.width === 0) return;

    const scale = 0.8 / Math.max(bounds.width / fullWidth, bounds.height / fullHeight);
    const midX = bounds.x + bounds.width / 2;
    const midY = bounds.y + bounds.height / 2;

    d3.select("#canvas").transition().duration(750).call(
        zoom.transform, 
        d3.zoomIdentity.translate(fullWidth/2 - scale*midX, fullHeight/2 - scale*midY).scale(scale)
    );
}

// UI Handlers
function toggleLegend() { document.getElementById('legend-overlay').classList.toggle('hidden'); }

window.onclick = (e) => {
    const legend = document.getElementById('legend-overlay');
    document.getElementById('context-menu').classList.add('hidden');
    if (e.target === legend) legend.classList.add('hidden');
};

function deleteBranch() {
    if (!selectedNode.parent) return alert("Cannot delete root");
    const p = selectedNode.parent.data;
    p.children = p.children.filter(c => c.id !== selectedNode.data.id);
    update();
}

function deleteSingleNode() {
    if (!selectedNode.parent) return alert("Cannot delete root");
    const p = selectedNode.parent.data;
    const children = selectedNode.data.children || [];
    p.children = p.children.filter(c => c.id !== selectedNode.data.id);
    p.children.push(...children);
    update();
}

function exportJSON() {
    const blob = new Blob([JSON.stringify(rawData, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = "mindmap.json"; a.click();
}

function importJSON(e) {
    const reader = new FileReader();
    reader.onload = (event) => { rawData = JSON.parse(event.target.result); update(); centerMap(); };
    reader.readAsText(e.target.files[0]);
}

function resetMap() { if(confirm("Clear map?")) { localStorage.clear(); location.reload(); } }

update();
centerMap(); // Initial centering
