import { v4 as uuid } from 'uuid'

export default function createDefaultBody() {
  return JSON.stringify([
    {
      id: uuid(),
      index: 0,
      tag: 'p',
      tabs: 0,
      p: {
        richText: [
          {
            type: 'text',
            text: {
              content: '',
            },
          },
        ],
        color: 'text-current',
      },
    },
  ])
}
