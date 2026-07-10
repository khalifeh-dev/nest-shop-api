import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    example:
      'Lorem ipsum dolor sit amet consectetur adipiscing, elit arcu eu dui lacus dictumst odio, platea ornare turpis nec nascetur. Curabitur quam euismod imperdiet praesent hendrerit facilisis class semper faucibus neque facilisi ridiculus dapibus, nibh enim scelerisque natoque lectus porttitor nullam fermentum curae eu ut nunc. Per urna lectus mi a pellentesque luctus habitasse mus metus ante, interdum risus sociis ultrices et enim laoreet platea nibh, aptent erat proin id leo mollis curae lacus quisque. Felis.',
    description: 'User Test First Name',
  })
  @IsOptional()
  @IsString()
  @Length(0, 512)
  @Transform(({ value }) => value?.trim())
  bio;
}
