/* ===============================
   App State
================================ */

let mindMapState = null;
let selectedNode = null;

const width = window.innerWidth;
const height = window.innerHeight - 48;

/* Slow, calm NotebookLM-like animation */
const DURATION = 900;

/* ===============================
   Color System
================================ */

const COLOR_SCALES = {
  blue:   ["#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd"],
  green:  ["#22c55e", "#4ade80", "#86efac", "#bbf7d0"],
  purple: ["#a855f7", "#c084fc", "#d8b4fe", "#e9d5ff"],
  amber:  ["#f59e0b", "#fbbf24", "#fde68a", "#fef3c7"]
};

/* ===============================
   SVG & D3 Setup
================================ */

const svg = d3.select("#mindmapSvg")
  .attr("width", width)
  .attr("height", height);

const g = svg.append("g");

svg.call(
  d3.zoom()
    .scaleExtent([0.2, 1.5])
    .on("zoom", e => g.attr("transform", e.transform))
);

const treeLayout = d3.tree().nodeSize([90, 260]);

/* ===============================
   Init
================================ */

(async function init() {
  const saved = await loadMindMap();
  mindMapState = saved || getFreshSampleMindMap();
  collapseAll(mindMapState.root);
  render();
  wireUI();
})();

/* ===============================
   Render
================================ */

function render() {
  const root = d3.hierarchy(mindMapState.root, d => d.children);
  treeLayout(root);

  /* -------- LINKS -------- */

  const link = g.selectAll(".link")
    .data(root.links(), d => d.target.data.id);

  link.exit()
    .transition().duration(DURATION)
    .style("opacity", 0)
    .remove();

  link.enter()
    .append("path")
    .attr("class", "link")
    .attr("d", d3.linkHorizontal()
      .x(d => d.source.y)
      .y(d => d.source.x)
    )
    .merge(link)
    .transition()
    .duration(DURATION)
    .ease(d3.easeCubicInOut)
    .attr("d", d3.linkHorizontal()
      .x(d => d.target.y)
      .y(d => d.target.x)
    );

  /* -------- NODES -------- */

  const node = g.selectAll(".node")
    .data(root.descendants(), d => d.data.id);

  node.exit()
    .transition().duration(DURATION)
    .attr("opacity", 0)
    .remove();

  const nodeEnter = node.enter()
    .append("g")
    .attr("class", "node")
    .attr("opacity", 0)
    .attr("transform", d =>
      `translate(${d.parent ? d.parent.y : 0},${d.parent ? d.parent.x : 0})`
    )
    .on("click", (e, d) => {
      e.stopPropagation();
      toggleNode(d);
      selectNode(d);
      scheduleAutosave(mindMapState);
      render();
    });

  nodeEnter.append("rect")
    .attr("width", 180)
    .attr("height", 52)
    .attr("x", -90)
    .attr("y", -26)
    .attr("rx", 10)
    .attr("ry", 10)
    .attr("fill", d => resolveNodeColor(d));

  nodeEnter.append("text")
    .attr("class", "title")
    .attr("text-anchor", "middle")
    .attr("dy", "-4")
    .text(d => d.data.title);

  nodeEnter.append("text")
    .attr("class", "description")
    .attr("text-anchor", "middle")
    .attr("dy", "14")
    .text(d => truncate(d.data.description));

  nodeEnter.merge(node)
    .transition()
    .duration(DURATION)
    .ease(d3.easeCubicInOut)
    .attr("opacity", 1)
    .attr("transform", d => `translate(${d.y},${d.x})`);
}

/* ===============================
   UI Wiring
================================ */

function wireUI() {

  nodeTitle.addEventListener("input", e => {
    if (!selectedNode) return;
    selectedNode.data.title = e.target.value;
    scheduleAutosave(mindMapState);
    render();
  });

  nodeDescription.addEventListener("input", e => {
    if (!selectedNode) return;
    selectedNode.data.description = e.target.value;
    scheduleAutosave(mindMapState);
    render();
  });

  addChildBtn.onclick = () => {
    if (!selectedNode) return;

    const isSegmentRoot = selectedNode.data.id === "root";

    const newNode = {
      id: generateId(),
      title: "New Node",
      description: "",
      children: []
    };

    if (isSegmentRoot) {
      const color = prompt(
        "Choose segment color: blue, green, purple, amber",
        "blue"
      );
      if (COLOR_SCALES[color]) {
        newNode.baseColor = color;
      }
    }

    selectedNode.data.children = selectedNode.data.children || [];
    selectedNode.data.children.push(newNode);

    scheduleAutosave(mindMapState);
    render();
  };

  deleteNodeBtn.onclick = () => {
    if (!selectedNode || selectedNode.data.id === "root") return;
    removeNode(mindMapState.root, selectedNode.data.id);
    selectedNode = null;
    scheduleAutosave(mindMapState);
    render();
  };

  newMapBtn.onclick = async () => {
    await clearMindMap();
    mindMapState = getFreshSampleMindMap();
    collapseAll(mindMapState.root);
    render();
  };

  exportBtn.onclick = () => exportMindMap(mindMapState);

  importInput.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    mindMapState = await importMindMap(file);
    scheduleAutosave(mindMapState);
    render();
  };

  collapseAllBtn.onclick = () => {
    collapseAll(mindMapState.root);
    scheduleAutosave(mindMapState);
    render();
  };

  expandAllBtn.onclick = () => {
    expandAll(mindMapState.root);
    scheduleAutosave(mindMapState);
    render();
  };
}

/* ===============================
   Color Resolver
================================ */

function resolveNodeColor(d) {
  let current = d;
  let depth = 0;

  while (current) {
    if (current.data.baseColor) {
      const scale = COLOR_SCALES[current.data.baseColor];
      return scale[Math.min(depth, scale.length - 1)];
    }
    current = current.parent;
    depth++;
  }

  return "#64748b"; // fallback gray
}

/* ===============================
   Tree Helpers
================================ */

function toggleNode(d) {
  if (d.data.children) {
    d.data._children = d.data.children;
    d.data.children = null;
  } else if (d.data._children) {
    d.data.children = d.data._children;
    d.data._children = null;
  }
}

function collapseAll(node) {
  if (!node.children) return;
  node._children = node.children;
  node._children.forEach(collapseAll);
  node.children = null;
}

function expandAll(node) {
  if (node._children) {
    node.children = node._children;
    node._children = null;
  }
  if (node.children) node.children.forEach(expandAll);
}

function removeNode(parent, id) {
  if (!parent.children) return false;
  const idx = parent.children.findIndex(c => c.id === id);
  if (idx !== -1) {
    parent.children.splice(idx, 1);
    return true;
  }
  return parent.children.some(c => removeNode(c, id));
}

/* ===============================
   Utilities
================================ */

function generateId() {
  return "node_" + Math.random().toString(36).slice(2, 10);
}

function truncate(text = "") {
  return text.length > 32 ? text.slice(0, 32) + "…" : text;
}

function selectNode(d) {
  selectedNode = d;
  nodeTitle.value = d.data.title;
  nodeDescription.value = d.data.description || "";
}
