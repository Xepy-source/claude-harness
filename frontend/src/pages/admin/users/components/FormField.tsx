import type { ReactNode } from 'react'
import styles from './FormField.module.scss'

interface FormFieldProps {
  label: string
  /** 입력 아래에 보여줄 안내 문구 */
  hint?: string
  /** input, select 등 입력 요소 하나 */
  children: ReactNode
}

/** 입력 요소에 이름표를 붙인다. 안내 문구는 label 밖에 두어 접근성 이름에 섞이지 않게 한다. */
export function FormField({ label, hint, children }: FormFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.control}>
        <span className={styles.label}>{label}</span>
        {children}
      </label>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  )
}
