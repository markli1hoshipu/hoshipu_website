import pickle
import business as bs
#此程序不在页面中 不可被调用
if __name__ == '__main__':
    passcode = input('请输入密码以初始化程序')
    
    f = open('business_data.txt','rb')
    c = f.read(); f.close()
    data = pickle.loads(c)
    for i in data.keys():
        for j in range(len(data[i])):
            data[i][j] = data[i][j].update()

    f = open('business_data.txt','wb');
    f.write(pickle.dumps(data))
    f.close()
    
    '''
    if passcode == '681206Lk@':
        past_data = {}
        past_id = []
        f = open('past_data.txt','wb')
        f.write(pickle.dumps(past_data))
        f.close()
        f = open('business_data.txt','wb')
        f.write(pickle.dumps(past_data))
        f.close()
        f = open('import_id.txt','wb')
        f.write(pickle.dumps(past_id))
        f.close()
        f = open('history.txt','w',encoding = 'utf8')
        f.write('')
        f.close()
        '''