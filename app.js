/* ===============================
   App State
================================ */

let mindMapState = null;
let selectedNode = null;

const width = window.innerWidth;
const height = window.innerHeight - 48;

/* ===============================
   SVG & D3 Setup
================================ */

const svg = d3.select("#mindmapSvg")
  .attr("width", width)
  .attr("height", height);

const g = svg.append("g");

const zoom = d3.zoom()
  .scaleExtent([0.2, 2])
  .on("zoom", (event) => {
    g.attr("transform", event.transform);
  });

svg.call(zoom);

const treeLayout = d3.tree().nodeSize([80, 220]);

/* ===============================
   Init
================================ */

async function init() {
  const saved = await loadMindMap();
  mindMapState = saved || getFreshSampleMindMap();
  render();
  wireUI();
}

init();

/* ===============================
   Rendering
================================ */

function render() {
  g.selectAll("*").remove();

  const root = d3.hierarchy(mindMapState.root);
  treeLayout(root);

  // Links
  g.selectAll(".link")
    .data(root.links())
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("d", d3.linkHorizontal()
      .x(d => d.y)
      .y(d => d.x)
    );

  // Nodes
  const node = g.selectAll(".node")
    .data(root.descendants(), d => d.data.id)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.y},${d.x})`)
    .on("click", (event, d) => {
      event.stopPropagation();
      selectNode(d);
    });

  node.append("rect")
    .attr("width", 160)
    .attr("height", 46)
    .attr("x", -80)
    .attr("y", -23);

  node.append("text")
    .attr("class", "title")
    .attr("text-anchor", "middle")
    .attr("dy", "-2")
    .text(d => d.data.title);

  node.append("text")
    .attr("class", "description")
    .attr("text-anchor", "middle")
    .attr("dy", "12")
    .text(d => truncate(d.data.description));

}

/* ===============================
   Node Selection & Editing
================================ */

function selectNode(d) {
  selectedNode = d;

  d3.selectAll(".node").classed("selected", false);
  d3.select(d3.event?.currentTarget).classed("selected", true);

  document.getElementById("nodeTitle").value = d.data.title;
  document.getElementById("nodeDescription").value = d.data.description || "";
}

/* ===============================
   UI Wiring
================================ */

function wireUI() {

  document.getElementById("nodeTitle").addEventListener("input", e => {
    if (!selectedNode) return;
    selectedNode.data.title = e.target.value;
    scheduleAutosave(mindMapState);
    render();
  });

  document.getElementById("nodeDescription").addEventListener("input", e => {
    if (!selectedNode) return;
    selectedNode.data.description = e.target.value;
    scheduleAutosave(mindMapState);
    render();
  });

  document.getElementById("addChildBtn").addEventListener("click", () => {
    if (!selectedNode) return;

    selectedNode.data.children.push({
      id: generateId(),
      title: "New Node",
      description: "",
      children: []
    });

    scheduleAutosave(mindMapState);
    render();
  });

  document.getElementById("deleteNodeBtn").addEventListener("click", () => {
    if (!selectedNode || selectedNode.data.id === "root") return;
    removeNode(mindMapState.root, selectedNode.data.id);
    selectedNode = null;
    scheduleAutosave(mindMapState);
    render();
  });

  document.getElementById("newMapBtn").addEventListener("click", async () => {
    await clearMindMap();
    mindMapState = getFreshSampleMindMap();
    render();
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    exportMindMap(mindMapState);
  });

  document.getElementById("importInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const data = await importMindMap(file);
    mindMapState = data;
    saveMindMap(mindMapState);
    render();
  });

}

/* ===============================
   Helpers
================================ */

function generateId() {
  return "node_" + Math.random().toString(36).substr(2, 9);
}

function truncate(text = "") {
  return text.length > 30 ? text.substring(0, 30) + "…" : text;
}

function removeNode(parent, id) {
  if (!parent.children) return false;
  const index = parent.children.findIndex(c => c.id === id);
  if (index !== -1) {
    parent.children.splice(index, 1);
    return true;
  }
  return parent.children.some(c => removeNode(c, id));
}
