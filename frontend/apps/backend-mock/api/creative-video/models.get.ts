import {defineEventHandler,setResponseStatus} from 'h3';
import {verifyAccessToken} from '~/utils/jwt-utils';
import {useResponseSuccess,useResponseError} from '~/utils/response';
import {modelCapabilities} from '~/utils/creative-models';
export default defineEventHandler(event=>{if(!verifyAccessToken(event)){setResponseStatus(event,401);return useResponseError('UNAUTHORIZED');}return useResponseSuccess(modelCapabilities);});
