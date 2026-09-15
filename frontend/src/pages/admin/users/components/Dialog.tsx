import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import styles from './Dialog.module.scss'

interface DialogProps {
  title: string
  onClose: () => void
  children: ReactNode
}

interface DragStart {
  mouseX: number
  mouseY: number
  x: number
  y: number
}

function clamp(value: number, limit: number): number {
  return Math.min(limit, Math.max(-limit, value))
}

/**
 * 화면 위에 뜨는 팝업. 제목 줄을 끌어 화면 안에서 옮길 수 있고, Esc나 닫기 버튼으로 닫는다.
 * 다른 페이지 폴더에서도 필요해지면 shared/components로 옮긴다.
 */
export function Dialog({ title, onClose, children }: DialogProps) {
  const titleId = useId()
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragStart = useRef<DragStart | null>(null)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    function handleMouseMove(event: MouseEvent) {
      const start = dragStart.current
      if (!start) {
        return
      }
      // 가운데 기준으로 화면 절반 이상은 벗어나지 않게 해서 제목 줄을 다시 잡을 수 있게 한다.
      setOffset({
        x: clamp(start.x + event.clientX - start.mouseX, window.innerWidth / 2),
        y: clamp(start.y + event.clientY - start.mouseY, window.innerHeight / 2),
      })
    }
    function handleMouseUp() {
      dragStart.current = null
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [onClose])

  function startDrag(event: ReactMouseEvent<HTMLElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) {
      return
    }
    event.preventDefault()
    dragStart.current = { mouseX: event.clientX, mouseY: event.clientY, ...offset }
  }

  return (
    <div className={styles.backdrop}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        style={{ left: offset.x, top: offset.y }}
      >
        <header className={styles.header} onMouseDown={startDrag}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
