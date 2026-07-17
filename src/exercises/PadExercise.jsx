import NumberPad, { PadDisplay } from './NumberPad.jsx'

/** A bare "type the answer" question: the expression, the readout, the pad. */
export default function PadExercise({ q, onAnswer, locked, phase, value, setValue }) {
  return (
    <div className="padx">
      {q.expr && <div className="q-expr">{q.expr}</div>}
      <PadDisplay value={value} phase={phase} />
      <NumberPad value={value} onChange={setValue} onSubmit={() => onAnswer(value)} locked={locked} />
    </div>
  )
}
