process.env.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || '{"key_ops":["sign"],"ext":true,"alg":"RS256","kty":"RSA","n":"-2AT6Ee63i_DNVX6v40Ot_JZgV3tR-RX17HvQU8BDhl7WLQ5ksrLUmmu56sT4kT2NESRGfEraW1eMRqNSPz6FTvYFPqxLeYjF1uTU-uEXCD30Mhfr5UF7HBFXbzIFM1OGf_J95DS9xX8FUhm2aZksOwR6FxfWn1x894wrhJ8fIas19FPP1DtkuXNDcLK7Ar47QoXIU1N2W5_KBjntbnEWQjZ6Mder1_UdhNiO7aZMCGlOlbt5JBSe-Jvk4iJX26PMiVuA6gtuU57mgVO1CJe_INqkQWotYkGePfazkkkwiTc1qELIOnNm2aCcBDLGhEzimKMLjUzueqgPMWTu79Wjw","e":"AQAB","d":"NnHcTfJ_SFFa--nX6fYQyomMlkb0Nh6AYiDRW7lTVqzxOMisMZ2HxR1LuzSkFV1vX-m77bz89JQyEvuXv0e_mKrCBeU4S-MtFYmJkuMPY27mjctgYiSqSEgW1hMl2M-Qy3PJ2Dt_XfHei_OHBzwRUfqHdGbRZkWGUVX-AC3T1Zpd4OL-zZrilVC_Nw9Esq3YK7V0bekRytho-YKcH2C8k8iEJ8n-_hWxSQIy-gxWHnXsUTHmHN-EGc0q9rKcP1TmHZHQOzjpAbhKNbjeiUpb0l6ihZm8gS0SHtnaVcDhSe6pgJYleptvjpC5OIdUuqKsI81FrON-R3W6ZVFWoTqGwQ","p":"_fJNd4JgWuGKY4sKz-8lUhNdI0X14yzrR0qp38Y6BPSGaSzZ-MIWx1b4g9kzDm1ak7Hy5mKv3rfFbrQYNVTtZn0hxoQA9w0FzHIuJpm1yg9-1yiGRLveYoi_eLqBOZyvufXfaday7k_Z7x9vfgTwpZXREc2U9unzMeTrRfc-akE","q":"_Whz15U7YSM5n2vSxqjqZdCHjd7Uz7xDO5TnYI99zPa1tyWXsvQeCi2bAjv3kXSfG0mkfY0xBlUAvM-A3hVJcwofmnVly8IcMVeYm0fVzkqjnutddJrxz47LeXeJ29sbyEF-h3DiHPLBysJuVECKIJmCp08jRygINNG4mNZ0bM8","dp":"I4xFl9MiVdZ4ntKZ4t2hJcocIZHrh6-EB-jFutNuz77DCfoDUTUqJyFfjGVdJkncggxI6kMqR00GUCbZtK18xfoCPl3AHNUv2JyrJTAjKHPe15OOqBR8XuKxmt7QtBXg63EloxUw2vdGlJib7NIYNbWxHILgtWeuaW-YF6UykYE","dq":"XcIf2kvkxHP8Bfgm7EnjL_iPrvYbVyEY3xqg4SE2Mne1lCXckuGvm6R0DceSOcckdzwwGCP9V5Jry3AbBhBqNJ4yQzvchh8zvy3h0NIrUUBceZgr49DQVzNGJZMM9sOC6_0Pi51Ai-Vlvldh6tpWQOmLZcvqCZHON3zBCAuQ2BE","qi":"CPKNmHHkco7Dz4rRoGTXe5DZPXJTYTYSXW_85rFK97kfKv9zZi007yxrmXPYQzUsR0cDfNHITE0pE8DL8lueu76T8aGN2ZeGdR2k_RK-N1WFxGoRIj9cufS8PIgYK19kl4csOJysdseC4cgEpocwRJFIadA8625ewS9FBuyQaRU"}';
process.env.JWKS = process.env.JWKS || '{"keys":[{"key_ops":["verify"],"ext":true,"alg":"RS256","kty":"RSA","n":"-2AT6Ee63i_DNVX6v40Ot_JZgV3tR-RX17HvQU8BDhl7WLQ5ksrLUmmu56sT4kT2NESRGfEraW1eMRqNSPz6FTvYFPqxLeYjF1uTU-uEXCD30Mhfr5UF7HBFXbzIFM1OGf_J95DS9xX8FUhm2aZksOwR6FxfWn1x894wrhJ8fIas19FPP1DtkuXNDcLK7Ar47QoXIU1N2W5_KBjntbnEWQjZ6Mder1_UdhNiO7aZMCGlOlbt5JBSe-Jvk4iJX26PMiVuA6gtuU57mgVO1CJe_INqkQWotYkGePfazkkkwiTc1qELIOnNm2aCcBDLGhEzimKMLjUzueqgPMWTu79Wjw","e":"AQAB"}]}';
process.env.SITE_URL = process.env.SITE_URL || 'https://kuppet-busia.vercel.app';

import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile: (params) => {
        // Just return all params passed in as the profile
        return params as any;
      },
    }),
  ],
});
