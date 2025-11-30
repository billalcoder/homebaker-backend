
export async function findEmail(email , model){
    return await model.findOne({email}).lean()
} 