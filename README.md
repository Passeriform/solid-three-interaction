# @passeriform/solid-fiber-interaction

**Declarative pointer interactions using raycaster for ThreeJS in SolidJS.**

---

## Overview

`@passeriform/solid-fiber-interaction` provides a declarative way to handle pointer interactions (hovering and selection) in a ThreeJS scene within a SolidJS application. Using the `InteractionProvider` as the context and `useInteraction` hook as the interface, you can react to pointer events on meshes directly from your component tree without managing raycasting manually.

---

## Installation

```bash
npm install @passeriform/solid-fiber-interaction
# or
yarn add @passeriform/solid-fiber-interaction
```

---

## Usage

### Basic Example

```tsx
import { onCleanup, onMount, createEffect } from "solid-js"
import { BoxGeometry, Mesh, MeshBasicMaterial } from "three"
import SceneProvider, { useScene } from "@passeriform/solid-fiber-scene"
import InteractionProvider, { useInteraction } from "@passeriform/solid-fiber-interaction"

const Cube = () => {
    const { addToScene } = useScene()

    const cubeMesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: 0xff0000 }))

    const { interaction } = useInteraction({ root: cubeMesh })

    onMount(() => {
        addToScene(cubeMesh)
    })

    onCleanup(() => {
        cubeMesh.clear()
    })

    // React to hover state
    createEffect(() => {
        if (interaction.hovered.current === cubeMesh) {
            cubeMesh.material.color.set(0x00ff00)
        } else {
            cubeMesh.material.color.set(0xff0000)
        }
    })

    return <></>
}

const App = () => {
    return (
        <SceneProvider ambientLightColor={0xffffff} directionalLightPosition={{ x: 1, y: 2, z: 3 }}>
            <InteractionProvider>
                <Cube />
            </InteractionProvider>
        </SceneProvider>
    )
}

export default App
```

---

## API

### `InteractionProvider`

A context provider that sets up pointer interaction tracking for meshes:

- Tracks `hovered` and `selected` meshes
- Handles repeated hover/selection events
- Updates `document.body.style.cursor` automatically
- Supports custom root object, mesh filtering, and empty selection policy

```tsx
<InteractionProvider root={rootMesh} filter={(meshes) => meshes} allowEmptySelection={false}>
    {/* Components that will respond to pointer interaction */}
</InteractionProvider>
```

Props:

```ts
type InteractionOverridableProps<T extends Mesh> = {
    root: Object3D | undefined                  // root object to interact with
    filter: (meshes: Object3D[]) => T[]        // filter meshes to enable interaction
    allowEmptySelection: boolean                // allow clearing selection on click
}
```

---

### `useInteraction()`

Hook to access interaction state:

```ts
const { interaction, resetSelected } = useInteraction()
```

- `interaction.hovered` — hovered state `{ current, last, repeat }`
- `interaction.selected` — selected state `{ current, last, repeat }`
- `resetSelected()` — reset selection to `undefined`

You can optionally pass overrides:

```ts
const { interaction } = useInteraction({
    root: () => myRootMesh,
    filter: () => (meshes) => meshes.filter(mesh => mesh.name.startsWith("clickable")),
})
```

---

### Interaction State

```ts
type InteractionState<T extends Mesh> = {
    current: T | undefined    // mesh currently hovered or selected
    last: T | undefined       // previous mesh hovered or selected
    repeat: boolean           // whether the current mesh is repeated interaction
}
```

---

## Notes

- `InteractionProvider` must be rendered **inside** a `SceneProvider`.
- `useInteraction` must be called **inside** an `InteractionProvider`.
- Cursor updates automatically to `pointer` when hovering an interactive mesh.
- Filtering and root can be dynamically updated using props or setters returned by the provider.

---

## Contributing

Contributions are welcome! Open an issue or submit a pull request to add features, fix bugs, or improve documentation.

---

## License

MIT License
