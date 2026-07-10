import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export const Match = (
  property: string,
  ValidationOptions?: ValidationOptions,
) => {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: ValidationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyname] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyname];
          return value === relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyname] = args.constraints;
          return `${propertyName} must match ${relatedPropertyname}.`;
        },
      },
    });
  };
};
