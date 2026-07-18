import Cub from './Cub.jsx'
import { useStore } from '../game/store.jsx'

/** The chosen companion. Every screen renders this rather than a fixed species,
    so switching friend in settings changes the whole app at once. */
export default function Mascot(props) {
  const { state } = useStore()
  return <Cub species={state.settings.buddy ?? 'fox'} {...props} />
}
