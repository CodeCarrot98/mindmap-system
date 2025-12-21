/* ===============================
   App State
================================ */

let mindMapState = null;
let selectedNode = null;

const width = window.innerWidth;
const height = window.innerHeight - 48;

const DURATION = 800; // animation duration (ms)

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

  collapseAll(mindMapState.root);
  render();
  wireUI();
}

init();

/* ===============================
   Rendering with Animation
================================ */

function render() {
  const root = d3.hierarchy(
    mindMapState.root,
    d => d.children
  );

  treeLayout(root);

  /* ---------- LINKS ---------- */

  const link = g.selectAll(".link")
    .data(root.links(), d => d.target.data.id);

  link.exit()
    .transition()
    .duration(DURATION)
    .style("opacity", 0)
    .remove();

  link.enter()
    .append("path")
    .attr("class", "link")
    .attr("opacity", 0)
    .attr("d", d3.linkHorizontal()
      .x(d => d.source.y)
      .y(d => d.source.x)
    )
    .merge(link)
    .transition()
    .duration(DURATION)
    .ease(d3.easeCubicInOut)
    .attr("opacity", 1)
    .attr("d", d3.linkHorizontal()
      .x(d => d.target.y)
      .y(d => d.target.x)
    );

  /* ---------- NODES ---------- */

  const node = g.selectAll(".node")
    .data(root.descendants(), d => d.data.id);

  const nodeExit = node.exit();

  nodeExit.select("rect")
    .transition()
    .duration(DURATION)
    .attr("opacity", 0);

  nodeExit.transition()
    .duration(DURATION)
    .remove();

  const nodeEnter = node.enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.parent ? d.parent.y : 0},${d.parent ? d.parent.x : 0})`)
    .attr("opacity", 0)
    .on("click", (event, d) => {
      event.stopPropagation();
      toggleNode(d);
      selectNode(d);
      scheduleAutosave(mindMapState);
      render();
    });

  nodeEnter.append("rect")
    .attr("width", 160)
    .attr("height", 46)
    .attr("x", -80)
    .attr("y", -23);

  nodeEnter.append("text")
    .attr("class", "title")
    .attr("text-anchor", "middle")
    .attr("dy", "-2")
    .text(d => d.data.title);

  nodeEnter.append("text")
    .attr("class", "description")
    .attr("text-anchor", "middle")
    .attr("dy", "12")
    .text(d => truncate(d.data.description));

  nodeEnter.merge(node)
    .transition()
    .duration(DURATION)
    .ease(d3.easeCubicInOut)
    .attr("opacity", 1)
    .attr("transform", d => `translate(${d.y},${d.x})`);
}

/* ===============================
   Selection
================================ */

function selectNode(d) {
  selectedNode = d;
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

    selectedNode.data.children = selectedNode.data.children || [];
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
    collapseAll(mindMapState.root);
    render();
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    exportMindMap(mindMapState);
  });

  document.getElementById("importInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    mindMapState = await importMindMap(file);
    scheduleAutosave(mindMapState);
    render();
  });

  document.getElementById("collapseAllBtn").addEventListener("click", () => {
    collapseAll(mindMapState.root);
    scheduleAutosave(mindMapState);
    render();
  });

  document.ge
