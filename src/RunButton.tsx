type RunProps = {
    reset: boolean
    onClick: () => void
}

export function Run(props: RunProps) {
    let msg = props.reset ? "Reset" : "Run"
    let col = props.reset ? "reset" : "run"
    return (
        <button id="game-control-btn-playback" className="run-button-back" onClick={props.onClick} value={col}>
            <span className="run-button-front" title={col}>
                {msg}
            </span>
        </button>
    )
}
