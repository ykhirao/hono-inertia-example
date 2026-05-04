import { render } from 'hono/jsx/dom'
import { islands, type IslandName } from './islands'

const mountIslands = () => {
  const nodes = document.querySelectorAll<HTMLElement>('[data-island]')
  nodes.forEach((el) => {
    const name = el.dataset.island as IslandName | undefined
    if (!name) return
    const Component = islands[name]
    if (!Component) {
      console.warn(`[islands] Unknown island: ${name}`)
      return
    }
    let props: Record<string, unknown> = {}
    try {
      props = JSON.parse(el.dataset.props ?? '{}')
    } catch (e) {
      console.warn(`[islands] Invalid props for ${name}`, e)
    }
    // hono/jsx/dom の render() は、コンテナに一致するマークアップがあれば
    // ハイドレートとして振る舞い、なければ新規レンダリングする。
    render(<Component {...props} />, el)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountIslands)
} else {
  mountIslands()
}
