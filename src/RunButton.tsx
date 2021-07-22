type RunProps = {
    reset: boolean
    onClick: () => void
}

export function Run(props: RunProps) {
    let msg = props.reset ? "Reset" : "Run Program"
    return (
        <button id="btn-run" className="game-control-btn-playback" onClick={props.onClick}>
            {msg}
        </button>
    )
}
