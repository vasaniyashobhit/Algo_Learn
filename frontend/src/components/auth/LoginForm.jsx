import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useLoginMutation } from '../../hooks/mutations/auth.mutations.js';
import { useServerFormErrors } from '../../hooks/useServerFormErrors.js';
import { LOGIN_FIELDS, loginSchema } from '../../lib/authSchemas.js';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { FormAlert } from './FormAlert.jsx';

/** Email + password. `onSuccess` runs after the token is stored. */
export const LoginForm = ({ onSuccess }) => {
  const { register, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });
  const login = useLoginMutation();
  const { formError, handleServerError, clearFormError } = useServerFormErrors({
    setError,
    fields: LOGIN_FIELDS,
    context: 'login',
  });

  const onSubmit = async (values) => {
    clearFormError();
    try {
      await login.mutateAsync(values);
      onSuccess();
    } catch (error) {
      handleServerError(error);
    }
  };

  const { errors } = formState;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Log in" className="px-[1.6rem] pt-[1.6rem]">
      <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <FormAlert formError={formError} />
      <Button variant="plate" type="submit" wide loading={login.isPending}>
        {login.isPending ? 'Logging in' : 'Log in'}
      </Button>
    </form>
  );
};
