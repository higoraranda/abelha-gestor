import { useId, useState, type ComponentPropsWithoutRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type FieldProps = Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'id'> & { label: string }

export default function PasswordField({ label, ...props }: FieldProps) {
  const [visible, setVisible] = useState(false)
  const id = useId()
  return <div className="login-field">
    <label className="login-field-label" htmlFor={id}>{label}</label>
    <div className="password-field">
      <input {...props} id={id} type={visible ? 'text' : 'password'} spellCheck={false} autoCapitalize="none" />
      <button type="button" className="password-toggle" aria-controls={id}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setVisible(value => !value)}>
        {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
      </button>
    </div>
  </div>
}
