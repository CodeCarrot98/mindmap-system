/**
 * Default starter mind map
 * Used when no saved data exists in local storage
 */

const SAMPLE_MINDMAP = {
  version: "1.0",
  updatedAt: null,
  root: {
    id: "root",
    title: "Central Idea",
    description: "Double-click a node to edit. Click to expand.",
    children: [
      {
        id: "node_1",
        title: "First Branch",
        description: "This is a main topic",
        children: [
          {
            id: "node_1_1",
            title: "Sub Topic",
            description: "More detailed thinking",
            children: []
          }
        ]
      },
      {
        id: "node_2",
        title: "Second Branch",
        description: "Another main topic",
        children: []
      }
    ]
  }
};

/**
 * Utility to deep-clone the starter data
 * so we never mutate the constant
 */
function getFreshSampleMindMap() {
  return JSON.parse(JSON.stringify(SAMPLE_MINDMAP));
}
