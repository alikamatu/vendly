import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class SubmitVerificationDto {
  @IsString()
  @IsNotEmpty({ message: 'Verification document URL is required' })
  @IsUrl({}, { message: 'Please provide a valid URL for the verification document' })
  verification_doc: string;
}
