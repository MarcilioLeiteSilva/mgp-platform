import { Injectable } from '@nestjs/common';

@Injectable()
export class OrganizationsService {
  async listUserOrganizations() {
    return [
      {
        id: 'org_default_seed',
        name: 'Minha Organização',
        slug: 'minha-organizacao',
        role: 'OWNER',
        planTier: 'FREE',
      },
    ];
  }
}

