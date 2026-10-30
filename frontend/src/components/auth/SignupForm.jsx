import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useSignupMutation } from '../../hooks/mutations/auth.mutations.js';
import { useServerFormErrors } from '../../hooks/useServerFormErrors.js';
import { SIGNUP_FIELDS, signupSchema } from '../../lib/authSchemas.js';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { FormAlert } from './FormAlert.jsx';

/** Name, email and password. The Codeforces handle is linked after sign-up, on the dashboard. */
export const SignupForm = ({ onSuccess }) => {
  const { register, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onTouched',
  });
  const signup = useSignupMutation();
  const { formError, handleServerError, clearFormError } = useServerFormErrors({
    setError,
    fields: SIGNUP_FIELDS,
    context: 'signup',
  });

  const onSubmit = async (values) => {
    clearFormError();
    try {
      await signup.mutateAsync(values);
      onSuccess();
    } catch (error) {
      handleServerError(error);
    }
  };

  const { errors } = formState;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Sign up" className="px-[1.6rem] pt-[1.6rem]">
      <Input label="Name" autoComplete="name" error={errors.name?.message} {...register('name')} />
      <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="8+ characters, with at least one letter and one digit."
        error={errors.password?.message}
        {...register('password')}
      />
      <FormAlert formError={formError} />
      <Button variant="plate" type="submit" wide loading={signup.isPending}>
        {signup.isPending ? 'Creating account' : 'Create account'}
      </Button>
    </form>
  );
};
