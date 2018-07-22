import { TestBed, inject } from '@angular/core/testing';

import { ColorProviderService } from './color-provider.service';

describe('ColorProviderService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ColorProviderService]
    });
  });

  it('should be created', inject([ColorProviderService], (service: ColorProviderService) => {
    expect(service).toBeTruthy();
  }));
});
