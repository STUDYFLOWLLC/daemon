const { v4 } = require("uuid")

export default function createDefaultBody() {
  return JSON.stringify([
    {
      id: v4(),
      index: 0,
      tag: "p",
      tabs: 0,
      p: {
        richText: [
          {
            type: "text",
            text: {
              content: "",
            },
          },
        ],
        color: "text-current",
      },
    },
  ])
}
